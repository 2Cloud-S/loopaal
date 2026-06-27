import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { dynamoRequest, marshal, unmarshal } from "./dynamodb.ts";
import { keysFor, type StoredEntity } from "./dynamo-keys.ts";
import { audit, makeId, nowIso } from "./ids.ts";
import { config, useDynamoDb } from "./config.ts";
import type { AppState, AuditEvent, Campaign, MemoryItem, Prospect, Approval, WorkerJob, Connection, WorkspaceIdentity } from "../types.ts";

const demoFile = join(process.cwd(), "data", "loopaal.json");
const emptyState = (): AppState => ({ campaigns: [], prospects: [], memories: [], approvals: [], workerJobs: [], audit: [], connections: [] });
let queue = Promise.resolve();

type DynamoItem = StoredEntity & { pk: string; sk: string; gsi1pk?: string; gsi1sk?: string; gsi2pk?: string; gsi2sk?: string };

async function loadDemo(): Promise<AppState> {
  try {
    const state = JSON.parse(await readFile(demoFile, "utf8")) as Partial<AppState>;
    return { ...emptyState(), ...state, workerJobs: state.workerJobs || [], connections: state.connections || [] };
  } catch {
    return emptyState();
  }
}

async function saveDemo(state: AppState) {
  await mkdir(dirname(demoFile), { recursive: true });
  await writeFile(demoFile, JSON.stringify(state, null, 2));
}

async function putEntity(entity: StoredEntity) {
  if (!useDynamoDb()) return;
  const item = { ...entity, ...keysFor(entity) };
  await dynamoRequest("DynamoDB_20120810.PutItem", { TableName: config.tableName, Item: marshal(item) });
}

async function scanEntities(): Promise<StoredEntity[]> {
  const data = await dynamoRequest<{ Items?: Record<string, unknown>[] }>("DynamoDB_20120810.Scan", { TableName: config.tableName, Limit: 500 });
  return (data.Items || []).map(item => unmarshal(item as never) as unknown as StoredEntity);
}

function toState(entities: StoredEntity[]): AppState {
  return {
    campaigns: entities.filter((x): x is StoredEntity & Campaign => x.entityType === "campaign").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    prospects: entities.filter((x): x is StoredEntity & Prospect => x.entityType === "prospect").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    memories: entities.filter((x): x is StoredEntity & MemoryItem => x.entityType === "memory").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    approvals: entities.filter((x): x is StoredEntity & Approval => x.entityType === "approval").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    workerJobs: entities.filter((x): x is StoredEntity & WorkerJob => x.entityType === "workerJob").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    audit: entities.filter((x): x is StoredEntity & AuditEvent => x.entityType === "audit").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    connections: entities.filter((x): x is StoredEntity & Connection => x.entityType === "connection").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    identity: entities.find((x): x is StoredEntity & WorkspaceIdentity => x.entityType === "workspaceIdentity")
  };
}

function scopedState(state: AppState, workspaceId?: string): AppState {
  if (!workspaceId) return state;
  const campaigns = state.campaigns.filter(x => x.workspaceId === workspaceId);
  const campaignIds = new Set(campaigns.map(x => x.id));
  const prospects = state.prospects.filter(x => x.workspaceId === workspaceId || campaignIds.has(x.campaignId));
  const prospectIds = new Set(prospects.map(x => x.id));
  return {
    campaigns,
    prospects,
    workerJobs: state.workerJobs.filter(x => x.workspaceId === workspaceId || campaignIds.has(x.campaignId)),
    memories: state.memories.filter(x => x.workspaceId === workspaceId || campaignIds.has(x.scopeId) || x.tags.some(tag => campaignIds.has(tag))),
    approvals: state.approvals.filter(x => x.workspaceId === workspaceId || prospectIds.has(String(x.payload.prospectId || ""))),
    audit: state.audit.filter(x => x.workspaceId === workspaceId || campaigns.some(campaign => x.detail.includes(campaign.id) || x.detail.includes(campaign.name))),
    connections: state.connections.filter(x => x.workspaceId === workspaceId),
    identity: state.identity?.workspaceId === workspaceId ? state.identity : undefined
  };
}

function withWorkspace<T extends { workspaceId?: string }>(items: T[], workspaceId?: string) {
  if (!workspaceId) return items;
  return items.map(item => ({ ...item, workspaceId }));
}

export async function loadState(workspaceId?: string): Promise<AppState> {
  if (!useDynamoDb()) return scopedState(await loadDemo(), workspaceId);
  return scopedState(toState(await scanEntities()), workspaceId);
}

export async function replaceState(mutator: (state: AppState) => void | Promise<void>, workspaceId?: string) {
  let result = emptyState();
  queue = queue.then(async () => {
    const state = await loadState(workspaceId);
    await mutator(state);
    if (useDynamoDb()) {
      const entities: StoredEntity[] = [
        ...state.campaigns.map(x => ({ entityType: "campaign" as const, ...x })),
        ...state.prospects.map(x => ({ entityType: "prospect" as const, ...x })),
        ...state.memories.map(x => ({ entityType: "memory" as const, ...x })),
        ...state.approvals.map(x => ({ entityType: "approval" as const, ...x })),
        ...state.workerJobs.map(x => ({ entityType: "workerJob" as const, ...x })),
        ...state.audit.map(x => ({ entityType: "audit" as const, ...x })),
        ...state.connections.map(x => ({ entityType: "connection" as const, ...x })),
        ...(state.identity ? [{ entityType: "workspaceIdentity" as const, ...state.identity }] : [])
      ];
      await Promise.all(entities.map(putEntity));
    } else {
      await saveDemo(state);
    }
    result = state;
  });
  await queue;
  return result;
}

export async function appendAudit(action: string, detail: string, actor = "loopaal") {
  const event = audit(action, detail, actor);
  if (useDynamoDb()) await putEntity({ entityType: "audit", ...event });
  else await replaceState(state => { state.audit.unshift(event); });
  return event;
}

export async function saveCampaign(campaign: Campaign, workspaceId?: string) {
  const campaignWithWorkspace = workspaceId ? { ...campaign, workspaceId } : campaign;
  const event = workspaceId ? { ...audit("campaign.created", campaign.name, "operator"), workspaceId } : audit("campaign.created", campaign.name, "operator");
  if (useDynamoDb()) {
    await putEntity({ entityType: "campaign", ...campaignWithWorkspace });
    await putEntity({ entityType: "audit", ...event });
    return campaignWithWorkspace;
  }
  await replaceState(state => {
    state.campaigns.unshift(campaignWithWorkspace);
    state.audit.unshift(event);
  }, workspaceId);
  return campaignWithWorkspace;
}

export async function remember(scope: MemoryItem["scope"], scopeId: string, text: string, tags: string[] = [], workspaceId?: string) {
  const memory: MemoryItem = { id: makeId("mem"), workspaceId, scope, scopeId, text, tags, createdAt: nowIso() };
  const event = workspaceId ? { ...audit("memory.saved", `${scope}:${scopeId}`), workspaceId } : audit("memory.saved", `${scope}:${scopeId}`);
  if (useDynamoDb()) {
    await putEntity({ entityType: "memory", ...memory });
    await putEntity({ entityType: "audit", ...event });
    return loadState(workspaceId);
  }
  return replaceState(state => {
    state.memories.unshift(memory);
    state.audit.unshift(event);
  }, workspaceId);
}

export async function saveRunArtifacts(prospects: Prospect[], jobs: WorkerJob[], events: AuditEvent[], memories: MemoryItem[] = [], workspaceId?: string) {
  const scopedProspects = withWorkspace(prospects, workspaceId);
  const scopedJobs = withWorkspace(jobs, workspaceId);
  const scopedEvents = withWorkspace(events, workspaceId);
  const scopedMemories = withWorkspace(memories, workspaceId);
  if (useDynamoDb()) {
    const campaignId = scopedProspects[0]?.campaignId || scopedJobs[0]?.campaignId;
    const state = campaignId ? await loadState(workspaceId) : undefined;
    const campaign = state?.campaigns.find(x => x.id === campaignId);
    if (campaign) campaign.status = "complete";
    await Promise.all([
      ...(campaign ? [putEntity({ entityType: "campaign", ...campaign })] : []),
      ...scopedProspects.map(x => putEntity({ entityType: "prospect", ...x })),
      ...scopedJobs.map(x => putEntity({ entityType: "workerJob", ...x })),
      ...scopedEvents.map(x => putEntity({ entityType: "audit", ...x })),
      ...scopedMemories.map(x => putEntity({ entityType: "memory", ...x }))
    ]);
    return loadState(workspaceId);
  }
  return replaceState(state => {
    state.prospects.unshift(...scopedProspects);
    state.workerJobs.unshift(...scopedJobs);
    state.memories.unshift(...scopedMemories);
    state.audit.unshift(...scopedEvents);
    const campaign = scopedProspects[0] ? state.campaigns.find(x => x.id === scopedProspects[0].campaignId) : undefined;
    if (campaign) campaign.status = "complete";
  }, workspaceId);
}

export async function saveApproval(approval: Approval, workspaceId?: string) {
  const scopedApproval = workspaceId ? { ...approval, workspaceId } : approval;
  const event = workspaceId ? { ...audit("draft.created", approval.title), workspaceId } : audit("draft.created", approval.title);
  if (useDynamoDb()) {
    await putEntity({ entityType: "approval", ...scopedApproval });
    await putEntity({ entityType: "audit", ...event });
    return scopedApproval;
  }
  await replaceState(state => {
    state.approvals.unshift(scopedApproval);
    state.audit.unshift(event);
  }, workspaceId);
  return scopedApproval;
}

export async function updateProspectContact(id: string, contact: Pick<Prospect, "email" | "phone">, workspaceId?: string) {
  return replaceState(state => {
    const prospect = state.prospects.find(x => x.id === id);
    if (!prospect) throw new Error("Prospect not found");
    prospect.email = contact.email;
    prospect.phone = contact.phone;
    prospect.updatedAt = nowIso();
    state.audit.unshift({ ...audit("prospect.contact.updated", prospect.businessName, "operator"), workspaceId: prospect.workspaceId || workspaceId });
  }, workspaceId);
}

export async function patchApproval(id: string, patch: Partial<Pick<Approval, "status" | "scheduledFor" | "payload">>, workspaceId?: string) {
  return replaceState(state => {
    const approval = state.approvals.find(x => x.id === id);
    if (!approval) throw new Error("Approval not found");
    if (patch.status) approval.status = patch.status;
    if (patch.scheduledFor) approval.scheduledFor = patch.scheduledFor;
    if (patch.payload) approval.payload = { ...approval.payload, ...patch.payload };
    approval.updatedAt = nowIso();
    state.audit.unshift({ ...audit(`approval.${patch.status || "updated"}`, approval.title, "operator"), workspaceId: approval.workspaceId || workspaceId });
  }, workspaceId);
}

export async function setCampaignStatus(id: string, status: Campaign["status"], workspaceId?: string) {
  return replaceState(state => {
    const campaign = state.campaigns.find(x => x.id === id);
    if (campaign) campaign.status = status;
    state.audit.unshift(audit("campaign.status", `${id} -> ${status}`));
  }, workspaceId);
}

export async function updateApproval(id: string, status: Approval["status"], scheduledFor?: string, workspaceId?: string) {
  return replaceState(state => {
    const approval = state.approvals.find(x => x.id === id);
    if (!approval) throw new Error("Approval not found");
    approval.status = status;
    approval.scheduledFor = scheduledFor || approval.scheduledFor;
    approval.updatedAt = nowIso();
    state.audit.unshift(audit(`approval.${status}`, approval.title, "operator"));
  }, workspaceId);
}

export async function saveWorkspaceIdentity(input: Partial<WorkspaceIdentity> & { workspaceId: string }) {
  const now = nowIso();
  const identity: WorkspaceIdentity = {
    workspaceId: input.workspaceId,
    businessName: String(input.businessName || "").trim(),
    senderName: String(input.senderName || "").trim(),
    replyTo: String(input.replyTo || "").trim(),
    defaultTone: String(input.defaultTone || "").trim(),
    websiteUrl: String(input.websiteUrl || "").trim(),
    defaultSignature: String(input.defaultSignature || "").trim(),
    createdAt: input.createdAt || now,
    updatedAt: now
  };
  if (!identity.businessName) throw new Error("Business name is required");
  if (useDynamoDb()) {
    await putEntity({ entityType: "workspaceIdentity", ...identity });
    await putEntity({ entityType: "audit", ...audit("workspace.identity.saved", identity.businessName, "operator"), workspaceId: identity.workspaceId });
    return identity;
  }
  await replaceState(state => {
    state.identity = identity;
    state.audit.unshift({ ...audit("workspace.identity.saved", identity.businessName, "operator"), workspaceId: identity.workspaceId });
  }, identity.workspaceId);
  return identity;
}

export async function saveConnection(connection: Connection) {
  if (useDynamoDb()) {
    await putEntity({ entityType: "connection", ...connection });
    await putEntity({ entityType: "audit", ...audit("connection.saved", `${connection.provider}:${connection.label}`, "operator"), workspaceId: connection.workspaceId });
    return connection;
  }
  await replaceState(state => {
    const index = state.connections.findIndex(x => x.workspaceId === connection.workspaceId && x.provider === connection.provider);
    if (index >= 0) state.connections[index] = connection;
    else state.connections.unshift(connection);
    state.audit.unshift({ ...audit("connection.saved", `${connection.provider}:${connection.label}`, "operator"), workspaceId: connection.workspaceId });
  }, connection.workspaceId);
  return connection;
}

export function newWorkerJob(campaignId: string, workerId: string, status: WorkerJob["status"], summary: string, artifacts: Record<string, unknown> = {}, error?: string): WorkerJob {
  const now = nowIso();
  return { id: makeId("job"), campaignId, workerId, status, summary, artifacts, error, createdAt: now, updatedAt: now };
}
