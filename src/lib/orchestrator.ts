import { runWorkers } from "../../workers/src/index.ts";
import { normalizeCriteria } from "./criteria.ts";
import { audit, makeId, nowIso } from "./ids.ts";
import { recall } from "./memory.ts";
import { outboundRisk } from "./policies.ts";
import { loadState, newWorkerJob, remember, saveApproval, saveCampaign, saveRunArtifacts, setCampaignStatus, updateApproval } from "./repository.ts";
import { askAI, sendGmail, sendWhatsApp, updateWebsite } from "./adapters.ts";
import { config } from "./config.ts";
import type { Approval, Campaign, MemoryItem, Prospect, WorkerJob } from "../types.ts";

export async function createCampaign(name: string, raw: Record<string, unknown>) {
  const campaign: Campaign = { id: makeId("cmp"), name, status: "draft", criteria: normalizeCriteria(raw), createdAt: nowIso() };
  return saveCampaign(campaign);
}

export async function runCampaign(id: string) {
  const state = await loadState();
  const campaign = state.campaigns.find(x => x.id === id);
  if (!campaign) throw new Error("Campaign not found");
  await setCampaignStatus(id, "running");
  const baseInput = { campaign, prospects: state.prospects.filter(x => x.campaignId === id), memory: recall(state, `${campaign.name} ${campaign.criteria.industries.join(" ")}`) };
  const firstPass = await runWorkers(baseInput);
  const researched = firstPass.find(x => x.workerId === "researcher")?.artifacts.prospects as Prospect[] | undefined;
  const prospects = researched || [];
  const secondPass = await runWorkers({ ...baseInput, prospects });
  const results = [...firstPass.filter(x => x.workerId === "researcher"), ...secondPass.filter(x => x.workerId !== "researcher")];
  const jobs: WorkerJob[] = results.map(result => newWorkerJob(id, result.workerId, result.status === "complete" ? "complete" : "failed", result.summary, result.artifacts));
  const memoryResults: MemoryItem[] = results
    .filter(result => result.workerId === "archivist" && typeof result.artifacts.text === "string")
    .map(result => ({ id: makeId("mem"), scope: "campaign", scopeId: campaign.id, text: String(result.artifacts.text), tags: Array.isArray(result.artifacts.tags) ? result.artifacts.tags.map(String) : ["campaign"], createdAt: nowIso() }));
  const events = [
    audit("coworkers.completed", `${jobs.length} co-workers reported for ${campaign.name}`),
    audit("campaign.completed", `${prospects.length} prospects processed`)
  ];
  return saveRunArtifacts(prospects, jobs, events, memoryResults);
}

export async function draftOutreach(prospectId: string, channel: "gmail" | "whatsapp") {
  const state = await loadState();
  const prospect = state.prospects.find(x => x.id === prospectId);
  if (!prospect) throw new Error("Prospect not found");
  const campaign = state.campaigns.find(x => x.id === prospect.campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const fallbackBody = channel === "gmail"
    ? `Hello,\n\nI noticed ${prospect.businessName} fits the campaign focus around ${prospect.industry || "your sector"}. ${campaign.criteria.offer || "I have a practical idea that may be relevant to your team."}\n\nWould a short conversation be useful?\n`
    : `Hello — I noticed ${prospect.businessName} fits a current campaign focus. ${campaign.criteria.offer || "I have a practical idea that may be relevant."} Would a short conversation be useful?`;
  const fallbackSubject = `A practical idea for ${prospect.businessName}`;
  const generated = await generateOutreachDraft(campaign, prospect, channel);
  const body = generated.body || fallbackBody;
  const subject = generated.subject || fallbackSubject;
  const payload = {
    prospectId: prospect.id,
    to: channel === "gmail" ? prospect.email || "" : prospect.phone || "",
    subject: channel === "gmail" ? subject : undefined,
    body,
    draftSource: generated.source
  };
  const now = nowIso();
  const approval: Approval = { id: makeId("apr"), kind: channel === "gmail" ? "email" : "whatsapp", status: "pending", title: `${channel} · ${prospect.businessName}`, payload, createdAt: now, updatedAt: now };
  return saveApproval(approval);
}

async function generateOutreachDraft(campaign: Campaign, prospect: Prospect, channel: "gmail" | "whatsapp") {
  const prompt = [
    "Write supervised B2B outreach for Loopaal.",
    "Use only the provided prospect and campaign facts. Do not invent revenue, clients, contact names, awards, or pain points.",
    "Keep it concise, credible, and low-pressure. No spam wording, fake urgency, or exaggerated claims.",
    channel === "gmail"
      ? "Return strict JSON only with string fields: subject, body."
      : "Return strict JSON only with string field: body."
  ].join(" ");
  const input = JSON.stringify({
    channel,
    campaign: { name: campaign.name, criteria: campaign.criteria },
    prospect: {
      businessName: prospect.businessName,
      industry: prospect.industry,
      country: prospect.country,
      contactName: prospect.contactName,
      contactRole: prospect.contactRole,
      website: prospect.website,
      confidence: prospect.confidence,
      facts: prospect.facts,
      sources: prospect.sources
    }
  });
  try {
    const text = await askAI(prompt, input);
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned || "{}") as { subject?: unknown; body?: unknown };
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    return {
      subject: typeof parsed.subject === "string" ? parsed.subject.trim() : "",
      body,
      source: body ? config.ai.provider : "deterministic"
    };
  } catch {
    return { subject: "", body: "", source: "deterministic" };
  }
}

export async function approveAction(id: string, scheduledFor?: string) {
  const state = await updateApproval(id, "approved", scheduledFor);
  return executeDue(state);
}

export async function rejectAction(id: string) {
  return updateApproval(id, "rejected");
}

export async function requestWebsiteChange(data: Record<string, unknown>) {
  const now = nowIso();
  const approval: Approval = { id: makeId("apr"), kind: "website", status: "pending", title: `Website · ${String(data.title || "change request")}`, payload: data, createdAt: now, updatedAt: now };
  return saveApproval(approval);
}

export async function ingestReply(channel: "gmail" | "whatsapp", data: Record<string, unknown>) {
  return remember("conversation", String(data.threadId || data.from || makeId("thread")), JSON.stringify(data), [channel, "inbound"]);
}

export async function executeDue(state?: Awaited<ReturnType<typeof loadState>>) {
  const current = state || await loadState();
  for (const approval of current.approvals.filter(x => x.status === "approved" && (!x.scheduledFor || new Date(x.scheduledFor).getTime() <= Date.now()))) {
    const p = approval.payload;
    const risk = outboundRisk(String(p.body || ""));
    if (risk.length) await updateApproval(approval.id, "failed");
    else {
      if (approval.kind === "email") await sendGmail(String(p.to || ""), String(p.subject || ""), String(p.body || ""));
      if (approval.kind === "whatsapp") await sendWhatsApp(String(p.to || ""), String(p.body || ""));
      if (approval.kind === "website") await updateWebsite(p);
      await updateApproval(approval.id, "executed");
    }
  }
  return loadState();
}
