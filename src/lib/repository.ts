import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { dynamoRequest, marshal, unmarshal } from "./dynamodb.ts";
import { keysFor, type StoredEntity } from "./dynamo-keys.ts";
import { audit, makeId, nowIso } from "./ids.ts";
import { config, useDynamoDb } from "./config.ts";
import type { AppState, AuditEvent, Campaign, MemoryItem, Prospect, Approval, WorkerJob } from "../types.ts";

const demoFile = join(process.cwd(), "data", "loopaal.json");
const emptyState = (): AppState => ({ campaigns: [], prospects: [], memories: [], approvals: [], workerJobs: [], audit: [] });
let queue = Promise.resolve();

type DynamoItem = StoredEntity & { pk: string; sk: string; gsi1pk?: string; gsi1sk?: string; gsi2pk?: string; gsi2sk?: string };

async function loadDemo(): Promise<AppState> {
  try {
    const state = JSON.parse(await readFile(demoFile, "utf8")) as Partial<AppState>;
    return { ...emptyState(), ...state, workerJobs: state.workerJobs || [] };
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
    audit: entities.filter((x): x is StoredEntity & AuditEvent => x.entityType === "audit").sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

export async function loadState(): Promise<AppState> {
  if (!useDynamoDb()) return loadDemo();
  return toState(await scanEntities());
}

export async function replaceState(mutator: (state: AppState) => void | Promise<void>) {
  let result = emptyState();
  queue = queue.then(async () => {
    const state = await loadState();
    await mutator(state);
    if (useDynamoDb()) {
      const entities: StoredEntity[] = [
        ...state.campaigns.map(x => ({ entityType: "campaign" as const, ...x })),
        ...state.prospects.map(x => ({ entityType: "prospect" as const, ...x })),
        ...state.memories.map(x => ({ entityType: "memory" as const, ...x })),
        ...state.approvals.map(x => ({ entityType: "approval" as const, ...x })),
        ...state.workerJobs.map(x => ({ entityType: "workerJob" as const, ...x })),
        ...state.audit.map(x => ({ entityType: "audit" as const, ...x }))
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

export async function saveCampaign(campaign: Campaign) {
  if (useDynamoDb()) {
    await putEntity({ entityType: "campaign", ...campaign });
    await putEntity({ entityType: "audit", ...audit("campaign.created", campaign.name, "operator") });
    return campaign;
  }
  await replaceState(state => {
    state.campaigns.unshift(campaign);
    state.audit.unshift(audit("campaign.created", campaign.name, "operator"));
  });
  return campaign;
}

export async function remember(scope: MemoryItem["scope"], scopeId: string, text: string, tags: string[] = []) {
  const memory: MemoryItem = { id: makeId("mem"), scope, scopeId, text, tags, createdAt: nowIso() };
  const event = audit("memory.saved", `${scope}:${scopeId}`);
  if (useDynamoDb()) {
    await putEntity({ entityType: "memory", ...memory });
    await putEntity({ entityType: "audit", ...event });
    return loadState();
  }
  return replaceState(state => {
    state.memories.unshift(memory);
    state.audit.unshift(event);
  });
}

export async function saveRunArtifacts(prospects: Prospect[], jobs: WorkerJob[], events: AuditEvent[], memories: MemoryItem[] = []) {
  if (useDynamoDb()) {
    await Promise.all([
      ...prospects.map(x => putEntity({ entityType: "prospect", ...x })),
      ...jobs.map(x => putEntity({ entityType: "workerJob", ...x })),
      ...events.map(x => putEntity({ entityType: "audit", ...x })),
      ...memories.map(x => putEntity({ entityType: "memory", ...x }))
    ]);
    return loadState();
  }
  return replaceState(state => {
    state.prospects.unshift(...prospects);
    state.workerJobs.unshift(...jobs);
    state.memories.unshift(...memories);
    state.audit.unshift(...events);
    const campaign = prospects[0] ? state.campaigns.find(x => x.id === prospects[0].campaignId) : undefined;
    if (campaign) campaign.status = "complete";
  });
}

export async function saveApproval(approval: Approval) {
  if (useDynamoDb()) {
    await putEntity({ entityType: "approval", ...approval });
    await putEntity({ entityType: "audit", ...audit("draft.created", approval.title) });
    return approval;
  }
  await replaceState(state => {
    state.approvals.unshift(approval);
    state.audit.unshift(audit("draft.created", approval.title));
  });
  return approval;
}

export async function setCampaignStatus(id: string, status: Campaign["status"]) {
  return replaceState(state => {
    const campaign = state.campaigns.find(x => x.id === id);
    if (campaign) campaign.status = status;
    state.audit.unshift(audit("campaign.status", `${id} -> ${status}`));
  });
}

export async function updateApproval(id: string, status: Approval["status"], scheduledFor?: string) {
  return replaceState(state => {
    const approval = state.approvals.find(x => x.id === id);
    if (!approval) throw new Error("Approval not found");
    approval.status = status;
    approval.scheduledFor = scheduledFor || approval.scheduledFor;
    approval.updatedAt = nowIso();
    state.audit.unshift(audit(`approval.${status}`, approval.title, "operator"));
  });
}

export function newWorkerJob(campaignId: string, workerId: string, status: WorkerJob["status"], summary: string, artifacts: Record<string, unknown> = {}, error?: string): WorkerJob {
  const now = nowIso();
  return { id: makeId("job"), campaignId, workerId, status, summary, artifacts, error, createdAt: now, updatedAt: now };
}
