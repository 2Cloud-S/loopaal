import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { config, integrationStatus } from "./config.ts";
import { createCampaign, draftOutreach, runCampaign } from "./agent.ts";
import { sendGmail, sendWhatsApp, updateWebsite } from "./adapters.ts";
import { canExecute, outboundRisk } from "./policies.ts";
import { event, loadState, makeId, remember, updateState } from "./store.ts";

const webRoot = join(process.cwd(), "src", "web");
const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown> : {};
}

function json(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

async function executeDue() {
  const state = await loadState();
  for (const approval of state.approvals.filter(x => canExecute(x.status, x.scheduledFor))) {
    try {
      const p = approval.payload;
      const risk = outboundRisk(String(p.body || ""));
      if (risk.length) throw new Error(`Policy flags: ${risk.join(", ")}`);
      if (approval.kind === "email") await sendGmail(String(p.to), String(p.subject || ""), String(p.body || ""));
      if (approval.kind === "whatsapp") await sendWhatsApp(String(p.to), String(p.body || ""));
      if (approval.kind === "website") await updateWebsite(p);
      await updateState(s => { const item = s.approvals.find(x => x.id === approval.id)!; item.status = "executed"; item.updatedAt = new Date().toISOString(); s.audit.unshift(event("action.executed", item.title)); });
    } catch (error) {
      await updateState(s => { const item = s.approvals.find(x => x.id === approval.id)!; item.status = "failed"; item.updatedAt = new Date().toISOString(); s.audit.unshift(event("action.failed", `${item.title}: ${(error as Error).message}`)); });
    }
  }
}

async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === "GET" && url.pathname === "/api/state") return json(res, { ...(await loadState()), integrations: integrationStatus() });
  if (req.method === "POST" && url.pathname === "/api/campaigns") { const data = await body(req); return json(res, await createCampaign(String(data.name || "Untitled campaign"), data), 201); }
  const run = url.pathname.match(/^\/api\/campaigns\/([^/]+)\/run$/);
  if (req.method === "POST" && run) return json(res, await runCampaign(run[1]));
  if (req.method === "POST" && url.pathname === "/api/drafts") { const data = await body(req); return json(res, await draftOutreach(String(data.prospectId), data.channel === "whatsapp" ? "whatsapp" : "gmail"), 201); }
  const approve = url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
  if (req.method === "POST" && approve) { const data = await body(req); const next = approve[2] === "approve" ? "approved" : "rejected"; const state = await updateState(s => { const item = s.approvals.find(x => x.id === approve[1]); if (!item) throw new Error("Approval not found"); item.status = next; item.scheduledFor = data.scheduledFor ? String(data.scheduledFor) : item.scheduledFor; item.updatedAt = new Date().toISOString(); s.audit.unshift(event(`approval.${next}`, item.title, "operator")); }); await executeDue(); return json(res, state); }
  if (req.method === "POST" && url.pathname === "/api/memory") { const data = await body(req); return json(res, await remember((data.scope as "business") || "business", String(data.scopeId || "default"), String(data.text || ""), Array.isArray(data.tags) ? data.tags.map(String) : []), 201); }
  if (req.method === "POST" && url.pathname === "/api/website-changes") { const data = await body(req); const now = new Date().toISOString(); return json(res, await updateState(s => { s.approvals.unshift({ id: makeId("apr"), kind: "website", status: "pending", title: `Website · ${String(data.title || "change request")}`, payload: data, createdAt: now, updatedAt: now }); s.audit.unshift(event("website.change_requested", String(data.title || "change request"))); }), 201); }
  if (req.method === "POST" && (url.pathname === "/webhooks/gmail" || url.pathname === "/webhooks/whatsapp")) { const data = await body(req); const channel = url.pathname.endsWith("gmail") ? "gmail" : "whatsapp"; await remember("conversation", String(data.threadId || data.from || makeId("thread")), JSON.stringify(data), [channel, "inbound"]); return json(res, { received: true }); }
  return json(res, { error: "Not found" }, 404);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/webhooks/")) return await api(req, res, url);
    const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (relative.includes("..")) return json(res, { error: "Invalid path" }, 400);
    const content = await readFile(relative === "tokens.css" ? join(process.cwd(), "tokens.css") : join(webRoot, relative));
    res.writeHead(200, { "Content-Type": types[extname(relative)] || "application/octet-stream" }); res.end(content);
  } catch (error) { json(res, { error: (error as Error).message }, 500); }
});

setInterval(executeDue, 30_000).unref();
server.listen(config.port, () => console.log(`loopaal → http://localhost:${config.port}`));
