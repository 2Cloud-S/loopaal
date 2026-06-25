import { createHmac } from "node:crypto";
import { config } from "./config.ts";
import type { Prospect } from "./types.ts";

async function checked(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json().catch(() => ({}));
}

export async function askOpenAI(instructions: string, input: string, webSearch = false) {
  if (!config.openai.apiKey || !config.openai.model) return "";
  const body: Record<string, unknown> = { model: config.openai.model, instructions, input };
  if (webSearch) body.tools = [{ type: "web_search" }];
  const data = await checked("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openai.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }) as { output_text?: string };
  return data.output_text || "";
}

export async function appendProspectToSheet(prospect: Prospect) {
  if (!config.google.token || !config.google.sheetId) return { mode: "demo" };
  const range = encodeURIComponent("Prospects!A:L");
  return checked(`https://sheets.googleapis.com/v4/spreadsheets/${config.google.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: "POST", headers: { Authorization: `Bearer ${config.google.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [[prospect.id, prospect.businessName, prospect.website || "", prospect.industry || "", prospect.country || "", prospect.contactName || "", prospect.contactRole || "", prospect.email || "", prospect.phone || "", prospect.confidence, prospect.sources.join("\n"), prospect.updatedAt]] })
  });
}

export async function saveContextToDrive(name: string, content: unknown) {
  if (!config.google.token || !config.google.driveFolderId) return { mode: "demo" };
  const boundary = `loopaal_${Date.now()}`;
  const metadata = { name: `${name}.json`, parents: [config.google.driveFolderId], mimeType: "application/json" };
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content, null, 2)}\r\n--${boundary}--`;
  return checked("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", { method: "POST", headers: { Authorization: `Bearer ${config.google.token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
}

export async function sendGmail(to: string, subject: string, body: string) {
  if (!config.google.token || !config.google.sender) return { mode: "demo" };
  const mime = `From: ${config.google.sender}\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
  const raw = Buffer.from(mime).toString("base64url");
  return checked("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${config.google.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
}

export async function sendWhatsApp(to: string, body: string) {
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId) return { mode: "demo" };
  return checked(`https://graph.facebook.com/v23.0/${config.whatsapp.phoneNumberId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${config.whatsapp.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: false } }) });
}

export async function updateWebsite(change: Record<string, unknown>) {
  if (!config.website.url || !config.website.secret) return { mode: "demo" };
  const body = JSON.stringify(change);
  const signature = createHmac("sha256", config.website.secret).update(body).digest("hex");
  return checked(config.website.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Loopaal-Signature": signature }, body });
}
