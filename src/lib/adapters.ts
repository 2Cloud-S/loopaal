import { createHmac } from "node:crypto";
import { config } from "./config.ts";
import type { Connection, WorkspaceIdentity } from "../types.ts";

async function checked(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json().catch(() => ({}));
}

const cachedGoogleTokens = new Map<string, { accessToken: string; expiresAt: number }>();

export async function googleAccessToken(connection?: Connection) {
  if (connection?.accessToken && connection.expiresAt && new Date(connection.expiresAt).getTime() > Date.now() + 60_000) return connection.accessToken;
  const refreshToken = connection?.refreshToken;
  const cacheKey = connection?.id || refreshToken || "";
  const cachedGoogleToken = cachedGoogleTokens.get(cacheKey);
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 60_000) return cachedGoogleToken.accessToken;
  if (refreshToken && config.google.clientId && config.google.clientSecret) {
    const data = await checked("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    }) as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new Error("Google OAuth refresh did not return an access token");
    cachedGoogleTokens.set(cacheKey, {
      accessToken: data.access_token,
      expiresAt: Date.now() + Math.max(1, data.expires_in || 3600) * 1000
    });
    return data.access_token;
  }
  return "";
}

export async function askOpenAI(instructions: string, input: string, webSearch = false) {
  if (!config.openai.apiKey || !config.openai.model) return "";
  const body: Record<string, unknown> = { model: config.openai.model, instructions, input };
  if (webSearch) body.tools = [{ type: "web_search_preview" }];
  const data = await checked("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openai.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }) as { output_text?: string };
  return data.output_text || "";
}

export async function askGemini(instructions: string, input: string) {
  if (!config.ai.geminiApiKey || !config.ai.geminiModel) return "";
  const data = await checked(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.ai.geminiModel)}:generateContent?key=${encodeURIComponent(config.ai.geminiApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: "user", parts: [{ text: input }] }],
      generationConfig: { temperature: 0.35 }
    })
  }) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim() || "";
}

export async function askAI(instructions: string, input: string, webSearch = false) {
  if (config.ai.provider === "gemini") return askGemini(instructions, input);
  if (config.ai.provider === "openai") return askOpenAI(instructions, input, webSearch);
  return "";
}

export async function sendGmail(to: string, subject: string, body: string, connection?: Connection) {
  if (!config.outbound.live) return { mode: "preview", channel: "gmail", to, subject };
  const sender = gmailSender(connection);
  if (!sender || !to) return { mode: "demo", channel: "gmail", to, subject };
  const token = await googleAccessToken(connection);
  if (!token) return { mode: "demo", channel: "gmail", to, subject };
  const mime = buildEmailMime({ from: sender, replyTo: connection?.identity?.replyTo, to, subject, body, signature: connection?.identity?.signature });
  const raw = Buffer.from(mime).toString("base64url");
  return checked("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw })
  });
}

function gmailSender(connection?: Connection, workspaceIdentity?: WorkspaceIdentity) {
  const email = connection?.identity?.sendAsEmail || connection?.identity?.email || (connection?.label.includes("@") ? connection.label : "");
  if (!email) return "";
  const name = connection?.identity?.displayName || workspaceIdentity?.senderName || workspaceIdentity?.businessName || "";
  return name && !email.includes("<") ? `${name} <${email}>` : email;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function plainToHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function stripHtml(value: string) {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function buildEmailMime(input: { from: string; replyTo?: string; to: string; subject: string; body: string; signature?: string; workspaceSignature?: string }) {
  const signature = input.signature || input.workspaceSignature || "";
  const headers = [
    `From: ${input.from}`,
    input.replyTo ? `Reply-To: ${input.replyTo}` : "",
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0"
  ].filter(Boolean);
  const signatureLooksHtml = /<\/?[a-z][\s\S]*>/i.test(signature);
  if (signatureLooksHtml) {
    const htmlBody = `${plainToHtml(input.body)}${signature ? `<br><br>${signature}` : ""}`;
    return [...headers, "Content-Type: text/html; charset=UTF-8", "", htmlBody].join("\r\n");
  }
  const textBody = `${input.body}${signature ? `\n\n${stripHtml(signature)}` : ""}`;
  return [...headers, "Content-Type: text/plain; charset=UTF-8", "", textBody].join("\r\n");
}

export async function createGmailDraft(to: string, subject: string, body: string, connection?: Connection, workspaceIdentity?: WorkspaceIdentity) {
  const sender = gmailSender(connection, workspaceIdentity);
  if (!connection || !sender || !to) return { mode: "internal", channel: "gmail", to, subject };
  const token = await googleAccessToken(connection);
  if (!token) return { mode: "internal", channel: "gmail", to, subject };
  const mime = buildEmailMime({
    from: sender,
    replyTo: connection.identity?.replyTo || workspaceIdentity?.replyTo,
    to,
    subject,
    body,
    signature: connection.identity?.signature,
    workspaceSignature: workspaceIdentity?.defaultSignature
  });
  const raw = Buffer.from(mime).toString("base64url");
  const data = await checked("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw } })
  }) as { id?: string; message?: { id?: string; threadId?: string } };
  return {
    mode: "gmail_draft",
    channel: "gmail",
    to,
    subject,
    from: sender,
    replyTo: connection.identity?.replyTo || workspaceIdentity?.replyTo || "",
    signatureApplied: Boolean(connection.identity?.signature || workspaceIdentity?.defaultSignature),
    draftId: data.id || "",
    messageId: data.message?.id || "",
    threadId: data.message?.threadId || "",
    url: "https://mail.google.com/mail/u/0/#drafts"
  };
}

export async function sendWhatsApp(to: string, body: string, connection?: Connection) {
  const business = connection?.identity?.businessName || connection?.identity?.displayName || "WhatsApp Business";
  if (!config.outbound.live) return { mode: "preview", channel: "whatsapp", to, business };
  const token = connection?.accessToken || "";
  const phoneNumberId = connection?.identity?.phoneNumberId || connection?.label || "";
  if (!token || !phoneNumberId || !to) return { mode: "demo", channel: "whatsapp", to };
  return checked(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: false } })
  });
}

export async function updateWebsite(change: Record<string, unknown>, connection?: Connection) {
  const actor = connection?.identity?.businessName || connection?.identity?.displayName || "workspace";
  const domain = connection?.identity?.domain || "";
  const attributedChange = { ...change, actor, domain };
  if (!config.outbound.live) return { mode: "preview", channel: "website", change: attributedChange, actor, domain };
  const url = connection?.identity?.webhookUrl || connection?.label || "";
  const secret = connection?.accessToken || "";
  if (!url || !secret) return { mode: "demo", channel: "website", change: attributedChange, actor, domain };
  const body = JSON.stringify(attributedChange);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return checked(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Loopaal-Signature": signature, "X-Loopaal-Actor": actor }, body });
}
