import type { AppState } from "../types.ts";

export function recall(state: AppState, query: string, limit = 8) {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  return state.memories
    .map(item => ({
      item,
      score: terms.reduce((n, term) => n + (item.text.toLowerCase().includes(term) || item.tags.some(tag => tag.toLowerCase().includes(term)) ? 1 : 0), 0)
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
}
