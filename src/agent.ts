import { appendProspectToSheet, askOpenAI, saveContextToDrive } from "./adapters.ts";
import { event, loadState, makeId, recall, updateState } from "./store.ts";
import type { Approval, Campaign, CampaignCriteria, Prospect } from "./types.ts";

function list(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map(x => x.trim()).filter(Boolean);
  return String(value || "").split(/[,\n]/).map(x => x.trim()).filter(Boolean);
}

export function normalizeCriteria(raw: Record<string, unknown>): CampaignCriteria {
  return { businessNames: list(raw.businessNames), industries: list(raw.industries), countries: list(raw.countries), decisionMakers: list(raw.decisionMakers), offer: String(raw.offer || ""), notes: String(raw.notes || "") };
}

export async function createCampaign(name: string, raw: Record<string, unknown>) {
  const campaign: Campaign = { id: makeId("cmp"), name, status: "draft", criteria: normalizeCriteria(raw), createdAt: new Date().toISOString() };
  await updateState(state => { state.campaigns.unshift(campaign); state.audit.unshift(event("campaign.created", campaign.name, "operator")); });
  return campaign;
}

async function researcher(campaign: Campaign, businessName: string): Promise<Prospect> {
  const prompt = `Research ${businessName}. Criteria: ${JSON.stringify(campaign.criteria)}. Return concise JSON only with website, industry, country, contactName, contactRole, email, phone, facts (array), sources (array), confidence (0-1). Do not guess contact details. Use null when unverified.`;
  let enriched: Record<string, unknown> = {};
  try { const text = await askOpenAI("You are a careful B2B research worker. Cite public sources and separate verified facts from unknowns.", prompt, true); enriched = text ? JSON.parse(text.replace(/^```json|```$/g, "").trim()) : {}; } catch { enriched = {}; }
  return {
    id: makeId("pro"), campaignId: campaign.id, businessName,
    website: String(enriched.website || "") || undefined,
    industry: String(enriched.industry || campaign.criteria.industries[0] || "") || undefined,
    country: String(enriched.country || campaign.criteria.countries[0] || "") || undefined,
    contactName: String(enriched.contactName || "") || undefined,
    contactRole: String(enriched.contactRole || campaign.criteria.decisionMakers[0] || "") || undefined,
    email: String(enriched.email || "") || undefined, phone: String(enriched.phone || "") || undefined,
    facts: Array.isArray(enriched.facts) ? enriched.facts.map(String) : ["Research pending: connect OpenAI to enrich this record."],
    sources: Array.isArray(enriched.sources) ? enriched.sources.map(String) : [], confidence: Number(enriched.confidence || 0), updatedAt: new Date().toISOString()
  };
}

export async function runCampaign(id: string) {
  const state = await loadState();
  const campaign = state.campaigns.find(x => x.id === id);
  if (!campaign) throw new Error("Campaign not found");
  await updateState(s => { const target = s.campaigns.find(x => x.id === id)!; target.status = "running"; s.audit.unshift(event("coworkers.started", `researcher, analyst and archivist for ${campaign.name}`)); });
  const prospects = await Promise.all(campaign.criteria.businessNames.map(name => researcher(campaign, name)));
  for (const prospect of prospects) await appendProspectToSheet(prospect);
  await saveContextToDrive(`campaign-${campaign.id}`, { campaign, prospects });
  await updateState(s => { s.prospects.unshift(...prospects); const target = s.campaigns.find(x => x.id === id)!; target.status = "complete"; s.audit.unshift(event("campaign.completed", `${prospects.length} prospects processed`)); });
  return prospects;
}

export async function draftOutreach(prospectId: string, channel: "gmail" | "whatsapp") {
  const state = await loadState();
  const prospect = state.prospects.find(x => x.id === prospectId);
  if (!prospect) throw new Error("Prospect not found");
  const campaign = state.campaigns.find(x => x.id === prospect.campaignId)!;
  const memories = recall(state, `${prospect.businessName} ${prospect.industry || ""}`);
  const prompt = `Write a concise ${channel} outreach message for ${prospect.businessName}. Verified data: ${JSON.stringify(prospect)}. Offer: ${campaign.criteria.offer}. Notes: ${campaign.criteria.notes}. Relevant memory: ${JSON.stringify(memories)}. Adapt tone to the business. Never invent facts. ${channel === "gmail" ? "Return JSON with subject and body." : "Return only the message body."}`;
  let output = await askOpenAI("You write respectful, specific B2B outreach. One relevant observation, one credible offer, one low-pressure question. No hype.", prompt);
  if (!output) output = channel === "gmail" ? JSON.stringify({ subject: `A practical idea for ${prospect.businessName}`, body: `Hello,\n\nI’m reaching out with a relevant idea for ${prospect.businessName}. ${campaign.criteria.offer || "I’d like to learn whether we can help with your current priorities."}\n\nWould a brief conversation be useful?\n` }) : `Hello — I have a relevant idea for ${prospect.businessName}. Would a brief conversation be useful?`;
  let payload: Record<string, unknown>;
  try { payload = channel === "gmail" ? JSON.parse(output.replace(/^```json|```$/g, "").trim()) : { body: output }; } catch { payload = { subject: `A practical idea for ${prospect.businessName}`, body: output }; }
  payload.prospectId = prospect.id;
  payload.to = channel === "gmail" ? prospect.email || "" : prospect.phone || "";
  const now = new Date().toISOString();
  const approval: Approval = { id: makeId("apr"), kind: channel === "gmail" ? "email" : "whatsapp", status: "pending", title: `${channel} · ${prospect.businessName}`, payload, createdAt: now, updatedAt: now };
  await updateState(s => { s.approvals.unshift(approval); s.audit.unshift(event("draft.created", approval.title)); });
  return approval;
}
