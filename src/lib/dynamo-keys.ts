import type { Approval, AuditEvent, Campaign, MemoryItem, Prospect, WorkerJob } from "../types.ts";

export type StoredEntity =
  | ({ entityType: "campaign" } & Campaign)
  | ({ entityType: "prospect" } & Prospect)
  | ({ entityType: "memory" } & MemoryItem)
  | ({ entityType: "approval" } & Approval)
  | ({ entityType: "workerJob" } & WorkerJob)
  | ({ entityType: "audit" } & AuditEvent);

export function keysFor(entity: StoredEntity) {
  if (entity.entityType === "campaign") return { pk: `CAMPAIGN#${entity.id}`, sk: "META", gsi1pk: "ENTITY#campaign", gsi1sk: entity.createdAt };
  if (entity.entityType === "prospect") return { pk: `CAMPAIGN#${entity.campaignId}`, sk: `PROSPECT#${entity.id}`, gsi1pk: `CAMPAIGN#${entity.campaignId}`, gsi1sk: `PROSPECT#${entity.updatedAt}` };
  if (entity.entityType === "memory") return { pk: `MEMORY#${entity.scope}#${entity.scopeId}`, sk: `MEM#${entity.id}`, gsi2pk: `MEMORY#${entity.scope}`, gsi2sk: entity.createdAt };
  if (entity.entityType === "approval") return { pk: `APPROVAL#${entity.id}`, sk: "META", gsi1pk: `APPROVAL#${entity.status}`, gsi1sk: entity.scheduledFor || entity.createdAt };
  if (entity.entityType === "workerJob") return { pk: `CAMPAIGN#${entity.campaignId}`, sk: `WORKER#${entity.workerId}#${entity.id}`, gsi2pk: `WORKER#${entity.status}`, gsi2sk: entity.updatedAt };
  return { pk: "AUDIT", sk: `EVENT#${entity.createdAt}#${entity.id}`, gsi1pk: "ENTITY#audit", gsi1sk: entity.createdAt };
}
