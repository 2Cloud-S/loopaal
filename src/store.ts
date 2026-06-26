import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppState, AuditEvent, MemoryItem } from "./types.ts";

const file = join(process.cwd(), "data", "loopaal.json");
const emptyState = (): AppState => ({ campaigns: [], prospects: [], memories: [], approvals: [], workerJobs: [], audit: [], connections: [] });
let queue = Promise.resolve();

export async function loadState(): Promise<AppState> {
  try { return JSON.parse(await readFile(file, "utf8")) as AppState; }
  catch { return emptyState(); }
}

export async function updateState(mutator: (state: AppState) => void | Promise<void>) {
  let result: AppState = emptyState();
  queue = queue.then(async () => {
    const state = await loadState();
    await mutator(state);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(state, null, 2));
    result = state;
  });
  await queue;
  return result;
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function event(action: string, detail: string, actor = "loopaal"): AuditEvent {
  return { id: makeId("evt"), actor, action, detail, createdAt: new Date().toISOString() };
}

export async function remember(scope: MemoryItem["scope"], scopeId: string, text: string, tags: string[] = []) {
  return updateState(state => {
    state.memories.unshift({ id: makeId("mem"), scope, scopeId, text, tags, createdAt: new Date().toISOString() });
    state.audit.unshift(event("memory.saved", `${scope}:${scopeId}`));
  });
}

export function recall(state: AppState, query: string, limit = 8) {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  return state.memories
    .map(item => ({ item, score: terms.reduce((n, term) => n + (item.text.toLowerCase().includes(term) || item.tags.some(tag => tag.includes(term)) ? 1 : 0), 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.item);
}
