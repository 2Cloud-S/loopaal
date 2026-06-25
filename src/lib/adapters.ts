import { createHmac } from "node:crypto";
import { config } from "./config.ts";

async function checked(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json().catch(() => ({}));
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

export async function sendGmail(to: string, subject: string, body: string) {
  if (!config.google.token || !config.google.sender || !to) return { mode: "demo", channel: "gmail", to, subject };
  const mime = `From: ${config.google.sender}\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
  const raw = Buffer.from(mime).toString("base64url");
  return checked("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.google.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw })
  });
}

export async function sendWhatsApp(to: string, body: string) {
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId || !to) return { mode: "demo", channel: "whatsapp", to };
  return checked(`https://graph.facebook.com/v23.0/${config.whatsapp.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.whatsapp.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: false } })
  });
}

export async function updateWebsite(change: Record<string, unknown>) {
  if (!config.website.url || !config.website.secret) return { mode: "demo", channel: "website", change };
  const body = JSON.stringify(change);
  const signature = createHmac("sha256", config.website.secret).update(body).digest("hex");
  return checked(config.website.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Loopaal-Signature": signature }, body });
}
