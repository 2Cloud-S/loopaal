import { googleAccessToken } from "./adapters.ts";
import { appendWorkspaceAudit, importMemoryFactoryRows, loadState, updateConnectionIdentity } from "./repository.ts";
import { nowIso } from "./ids.ts";
import type { AppState, AuditEvent, Campaign, Connection, MemoryItem, Prospect, WorkerJob } from "../types.ts";

const FOLDER_NAME = "Loopaal Memory Factory";
const SHEET_NAME = "Loopaal Memory Workspace";

export const SHEET_TABS = {
  memory: "Memory",
  prospects: "Prospects",
  campaign: "Campaign Context",
  audit: "Audit Export"
} as const;

export const MEMORY_HEADERS = ["id", "scope", "scopeId", "text", "tags", "source", "status", "createdAt", "updatedAt"];
export const PROSPECT_HEADERS = ["id", "campaignId", "businessName", "website", "industry", "country", "contactName", "contactRole", "email", "phone", "confidence", "notes", "updatedAt"];
export const CAMPAIGN_HEADERS = ["campaignId", "campaignName", "criteria", "offer", "notes", "workerSummary", "createdAt"];
export const AUDIT_HEADERS = ["id", "actor", "action", "detail", "createdAt"];

async function checked<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json().catch(() => ({})) as Promise<T>;
}

function requireGoogle(state: AppState) {
  const google = state.connections.find(connection => connection.provider === "google" && connection.status === "connected");
  if (!google) throw new Error("Connect Google before enabling Memory Factory");
  return google;
}

function authHeaders(token: string, contentType = "application/json") {
  return { Authorization: `Bearer ${token}`, "Content-Type": contentType };
}

function sheetUrl(spreadsheetId: string) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

function folderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

function quoteRange(tab: string, range: string) {
  return encodeURIComponent(`'${tab}'!${range}`);
}

function cleanEmail(value: unknown) {
  const email = String(value || "").trim();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Invalid email: ${email}`);
  return email;
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/[^\d+]/g, "").slice(0, 32);
}

function csvTags(tags: string[]) {
  return tags.join(", ");
}

function parseTags(value: unknown) {
  return String(value || "").split(",").map(tag => tag.trim()).filter(Boolean);
}

export function memoryFactoryStatus(connection?: Connection) {
  const identity = connection?.identity || {};
  return {
    connected: Boolean(connection),
    enabled: Boolean(identity.memoryFactoryEnabled && identity.driveFolderId && identity.spreadsheetId),
    driveFolderId: identity.driveFolderId || "",
    driveFolderUrl: identity.driveFolderUrl || "",
    spreadsheetId: identity.spreadsheetId || "",
    spreadsheetUrl: identity.spreadsheetUrl || "",
    lastMemorySyncAt: identity.lastMemorySyncAt || "",
    lastMemorySyncStatus: identity.lastMemorySyncStatus || "",
    lastMemorySyncError: identity.lastMemorySyncError || ""
  };
}

export function memoryToSheetRow(memory: MemoryItem) {
  return [
    memory.id,
    memory.scope,
    memory.scopeId,
    memory.text,
    csvTags(memory.tags),
    "dynamodb",
    memory.status || "active",
    memory.createdAt,
    ""
  ];
}

export function prospectToSheetRow(prospect: Prospect) {
  return [
    prospect.id,
    prospect.campaignId,
    prospect.businessName,
    prospect.website || "",
    prospect.industry || "",
    prospect.country || "",
    prospect.contactName || "",
    prospect.contactRole || "",
    prospect.email || "",
    prospect.phone || "",
    prospect.confidence,
    prospect.notes || "",
    prospect.updatedAt
  ];
}

function campaignToSheetRow(campaign: Campaign, jobs: WorkerJob[]) {
  return [
    campaign.id,
    campaign.name,
    JSON.stringify(campaign.criteria),
    campaign.criteria.offer,
    campaign.criteria.notes,
    jobs.filter(job => job.campaignId === campaign.id).map(job => `${job.workerId}: ${job.summary}`).join("\n"),
    campaign.createdAt
  ];
}

function auditToSheetRow(event: AuditEvent) {
  return [event.id, event.actor, event.action, event.detail, event.createdAt];
}

function rowsToObjects(headers: string[], rows: unknown[][]) {
  return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

export function parseMemorySheetRows(rows: unknown[][]) {
  const [, ...data] = rows;
  return rowsToObjects(MEMORY_HEADERS, data).map(row => ({
    kind: "memory" as const,
    id: String(row.id || ""),
    text: String(row.text || ""),
    tags: parseTags(row.tags),
    status: String(row.status || "active")
  })).filter(row => row.id);
}

export function parseProspectSheetRows(rows: unknown[][]) {
  const [, ...data] = rows;
  return rowsToObjects(PROSPECT_HEADERS, data).map(row => ({
    kind: "prospect" as const,
    id: String(row.id || ""),
    website: String(row.website || "").trim(),
    contactName: String(row.contactName || "").trim(),
    contactRole: String(row.contactRole || "").trim(),
    email: cleanEmail(row.email),
    phone: cleanPhone(row.phone),
    notes: String(row.notes || "").trim()
  })).filter(row => row.id);
}

async function findDriveFile(token: string, query: string) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name,webViewLink)");
  url.searchParams.set("pageSize", "1");
  const data = await checked<{ files?: Array<{ id: string; webViewLink?: string }> }>(url.toString(), { headers: authHeaders(token) });
  return data.files?.[0];
}

async function createDriveFolder(token: string) {
  const existing = await findDriveFile(token, `name='${FOLDER_NAME.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  if (existing) return { id: existing.id, url: existing.webViewLink || folderUrl(existing.id) };
  const created = await checked<{ id: string; webViewLink?: string }>("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" })
  });
  return { id: created.id, url: created.webViewLink || folderUrl(created.id) };
}

async function createSpreadsheet(token: string, folderId: string) {
  const existing = await findDriveFile(token, `name='${SHEET_NAME.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents and trashed=false`);
  if (existing) return { id: existing.id, url: sheetUrl(existing.id) };
  const created = await checked<{ spreadsheetId: string; spreadsheetUrl?: string }>("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ properties: { title: SHEET_NAME }, sheets: [{ properties: { title: SHEET_TABS.memory } }] })
  });
  await checked(`https://www.googleapis.com/drive/v3/files/${created.spreadsheetId}?addParents=${encodeURIComponent(folderId)}&fields=id,parents`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({})
  });
  return { id: created.spreadsheetId, url: created.spreadsheetUrl || sheetUrl(created.spreadsheetId) };
}

async function ensureTabs(token: string, spreadsheetId: string) {
  const current = await checked<{ sheets?: Array<{ properties?: { title?: string } }> }>(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: authHeaders(token)
  });
  const existing = new Set((current.sheets || []).map(sheet => sheet.properties?.title).filter(Boolean));
  const requests = Object.values(SHEET_TABS)
    .filter(title => !existing.has(title))
    .map(title => ({ addSheet: { properties: { title } } }));
  if (requests.length) {
    await checked(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ requests })
    });
  }
  await Promise.all([
    writeSheetValues(token, spreadsheetId, SHEET_TABS.memory, [MEMORY_HEADERS]),
    writeSheetValues(token, spreadsheetId, SHEET_TABS.prospects, [PROSPECT_HEADERS]),
    writeSheetValues(token, spreadsheetId, SHEET_TABS.campaign, [CAMPAIGN_HEADERS]),
    writeSheetValues(token, spreadsheetId, SHEET_TABS.audit, [AUDIT_HEADERS])
  ]);
}

async function writeSheetValues(token: string, spreadsheetId: string, tab: string, values: unknown[][]) {
  const range = quoteRange(tab, `A1:Z${Math.max(values.length, 1)}`);
  await checked(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({})
  });
  return checked(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ values })
  });
}

async function readSheetValues(token: string, spreadsheetId: string, tab: string) {
  const range = quoteRange(tab, "A1:Z1000");
  const data = await checked<{ values?: unknown[][] }>(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: authHeaders(token)
  });
  return data.values || [];
}

export async function setupMemoryFactory(workspaceId: string) {
  const state = await loadState(workspaceId);
  const google = requireGoogle(state);
  const token = await googleAccessToken(google);
  if (!token) throw new Error("Google token is unavailable; reconnect Google");
  try {
    const folder = await createDriveFolder(token);
    const spreadsheet = await createSpreadsheet(token, folder.id);
    await ensureTabs(token, spreadsheet.id);
    const now = nowIso();
    await updateConnectionIdentity(workspaceId, "google", {
      memoryFactoryEnabled: true,
      driveFolderId: folder.id,
      driveFolderUrl: folder.url,
      spreadsheetId: spreadsheet.id,
      spreadsheetUrl: spreadsheet.url,
      lastMemorySyncAt: now,
      lastMemorySyncStatus: "ready",
      lastMemorySyncError: ""
    });
    await appendWorkspaceAudit("memory_factory.setup", "Memory Factory enabled", workspaceId, "operator");
    return { enabled: true, driveFolderUrl: folder.url, spreadsheetUrl: spreadsheet.url };
  } catch (error) {
    await updateConnectionIdentity(workspaceId, "google", { lastMemorySyncAt: nowIso(), lastMemorySyncStatus: "failed", lastMemorySyncError: error instanceof Error ? error.message : String(error) });
    await appendWorkspaceAudit("memory_factory.setup.failed", error instanceof Error ? error.message : String(error), workspaceId);
    throw error;
  }
}

export async function getMemoryFactoryStatus(workspaceId: string) {
  const state = await loadState(workspaceId);
  return memoryFactoryStatus(state.connections.find(connection => connection.provider === "google" && connection.status === "connected"));
}

function fullContext(state: AppState, campaignId?: string) {
  const campaignIds = campaignId ? new Set([campaignId]) : new Set(state.campaigns.map(campaign => campaign.id));
  return {
    identity: state.identity,
    campaigns: state.campaigns.filter(campaign => campaignIds.has(campaign.id)),
    prospects: state.prospects.filter(prospect => campaignIds.has(prospect.campaignId)),
    workerJobs: state.workerJobs.filter(job => campaignIds.has(job.campaignId)),
    memories: state.memories.filter(memory => !campaignId || campaignIds.has(memory.scopeId) || memory.tags.includes(campaignId)),
    approvals: state.approvals,
    audit: state.audit
  };
}

export async function exportMemoryFactory(workspaceId: string, campaignId?: string) {
  const state = await loadState(workspaceId);
  const google = requireGoogle(state);
  const status = memoryFactoryStatus(google);
  if (!status.enabled) throw new Error("Enable Memory Factory before exporting");
  const token = await googleAccessToken(google);
  if (!token) throw new Error("Google token is unavailable; reconnect Google");
  try {
    const spreadsheetId = status.spreadsheetId;
    await Promise.all([
      writeSheetValues(token, spreadsheetId, SHEET_TABS.memory, [MEMORY_HEADERS, ...state.memories.map(memoryToSheetRow)]),
      writeSheetValues(token, spreadsheetId, SHEET_TABS.prospects, [PROSPECT_HEADERS, ...state.prospects.map(prospectToSheetRow)]),
      writeSheetValues(token, spreadsheetId, SHEET_TABS.campaign, [CAMPAIGN_HEADERS, ...state.campaigns.map(campaign => campaignToSheetRow(campaign, state.workerJobs))]),
      writeSheetValues(token, spreadsheetId, SHEET_TABS.audit, [AUDIT_HEADERS, ...state.audit.map(auditToSheetRow)])
    ]);
    await saveDriveContextSnapshot(workspaceId, campaignId ? `campaign-${campaignId}` : "workspace-context", fullContext(state, campaignId));
    await updateConnectionIdentity(workspaceId, "google", { lastMemorySyncAt: nowIso(), lastMemorySyncStatus: "exported", lastMemorySyncError: "" });
    await appendWorkspaceAudit("memory_factory.exported", campaignId ? `campaign:${campaignId}` : "workspace", workspaceId);
    return { exported: true, spreadsheetUrl: status.spreadsheetUrl, driveFolderUrl: status.driveFolderUrl };
  } catch (error) {
    await updateConnectionIdentity(workspaceId, "google", { lastMemorySyncAt: nowIso(), lastMemorySyncStatus: "failed", lastMemorySyncError: error instanceof Error ? error.message : String(error) });
    await appendWorkspaceAudit("memory_factory.export.failed", error instanceof Error ? error.message : String(error), workspaceId);
    throw error;
  }
}

export async function importMemoryFactory(workspaceId: string) {
  const state = await loadState(workspaceId);
  const google = requireGoogle(state);
  const status = memoryFactoryStatus(google);
  if (!status.enabled) throw new Error("Enable Memory Factory before importing");
  const token = await googleAccessToken(google);
  if (!token) throw new Error("Google token is unavailable; reconnect Google");
  try {
    const [memoryRows, prospectRows] = await Promise.all([
      readSheetValues(token, status.spreadsheetId, SHEET_TABS.memory),
      readSheetValues(token, status.spreadsheetId, SHEET_TABS.prospects)
    ]);
    const rows = [...parseMemorySheetRows(memoryRows), ...parseProspectSheetRows(prospectRows)];
    await importMemoryFactoryRows(rows, workspaceId);
    await updateConnectionIdentity(workspaceId, "google", { lastMemorySyncAt: nowIso(), lastMemorySyncStatus: "imported", lastMemorySyncError: "" });
    await appendWorkspaceAudit("memory_factory.imported", `${rows.length} editable rows processed`, workspaceId, "operator");
    return { imported: rows.length };
  } catch (error) {
    await updateConnectionIdentity(workspaceId, "google", { lastMemorySyncAt: nowIso(), lastMemorySyncStatus: "failed", lastMemorySyncError: error instanceof Error ? error.message : String(error) });
    await appendWorkspaceAudit("memory_factory.import.failed", error instanceof Error ? error.message : String(error), workspaceId);
    throw error;
  }
}

export async function saveDriveContextSnapshot(workspaceId: string, name: string, content?: unknown) {
  const state = await loadState(workspaceId);
  const google = requireGoogle(state);
  const status = memoryFactoryStatus(google);
  if (!status.enabled) throw new Error("Enable Memory Factory before saving context");
  const token = await googleAccessToken(google);
  if (!token) throw new Error("Google token is unavailable; reconnect Google");
  const safeName = String(name || "context").replace(/[^\w-]+/g, "-").slice(0, 80);
  const boundary = `loopaal_${Date.now()}`;
  const metadata = { name: `${safeName}-${Date.now()}.json`, parents: [status.driveFolderId], mimeType: "application/json" };
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content || fullContext(state), null, 2)}\r\n--${boundary}--`;
  const data = await checked<{ id?: string; webViewLink?: string }>("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: authHeaders(token, `multipart/related; boundary=${boundary}`),
    body
  });
  await appendWorkspaceAudit("memory_factory.context.saved", metadata.name, workspaceId);
  return { id: data.id || "", url: data.webViewLink || (data.id ? `https://drive.google.com/file/d/${data.id}/view` : "") };
}

export async function listDriveContextSnapshots(workspaceId: string) {
  const state = await loadState(workspaceId);
  const google = requireGoogle(state);
  const status = memoryFactoryStatus(google);
  if (!status.enabled) throw new Error("Enable Memory Factory before listing context");
  const token = await googleAccessToken(google);
  if (!token) throw new Error("Google token is unavailable; reconnect Google");
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `'${status.driveFolderId}' in parents and mimeType='application/json' and trashed=false`);
  url.searchParams.set("fields", "files(id,name,createdTime,webViewLink)");
  url.searchParams.set("orderBy", "createdTime desc");
  url.searchParams.set("pageSize", "20");
  const data = await checked<{ files?: Array<{ id: string; name: string; createdTime?: string; webViewLink?: string }> }>(url.toString(), { headers: authHeaders(token) });
  return { files: data.files || [] };
}
