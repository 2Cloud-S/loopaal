import type { AuditEvent } from "../types.ts";

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function audit(action: string, detail: string, actor = "loopaal"): AuditEvent {
  return { id: makeId("evt"), actor, action, detail, createdAt: nowIso() };
}
