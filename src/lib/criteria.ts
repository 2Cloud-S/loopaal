import type { CampaignCriteria } from "../types.ts";

export function list(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map(x => x.trim()).filter(Boolean);
  return String(value || "").split(/[,\n]/).map(x => x.trim()).filter(Boolean);
}

export function normalizeCriteria(raw: Record<string, unknown>): CampaignCriteria {
  return {
    businessNames: list(raw.businessNames),
    industries: list(raw.industries),
    countries: list(raw.countries),
    decisionMakers: list(raw.decisionMakers),
    offer: String(raw.offer || ""),
    notes: String(raw.notes || "")
  };
}
