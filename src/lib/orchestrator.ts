import { runWorkers } from "../../workers/src/index.ts";
import { normalizeCriteria } from "./criteria.ts";
import { audit, makeId, nowIso } from "./ids.ts";
import { recall } from "./memory.ts";
import { outboundRisk } from "./policies.ts";
import { loadState, newWorkerJob, remember, patchApproval, saveApproval, saveCampaign, saveRunArtifacts, setCampaignStatus, updateApproval } from "./repository.ts";
import { askAI, createGmailDraft, sendGmail, sendWhatsApp, updateWebsite } from "./adapters.ts";
import { config } from "./config.ts";
import { exportMemoryFactory } from "./memory-factory.ts";
import { assertAiAvailableForNewCampaign } from "./ai-security.ts";
import type { Approval, Campaign, MemoryItem, Prospect, WorkerJob, WorkspaceIdentity } from "../types.ts";

export async function createCampaign(name: string, raw: Record<string, unknown>, workspaceId?: string) {
  assertAiAvailableForNewCampaign(await loadState(workspaceId));
  const campaign: Campaign = { id: makeId("cmp"), workspaceId, name, status: "draft", criteria: normalizeCriteria(raw), createdAt: nowIso() };
  return saveCampaign(campaign, workspaceId);
}

export async function runCampaign(id: string, workspaceId?: string) {
  const state = await loadState(workspaceId);
  const campaign = state.campaigns.find(x => x.id === id);
  if (!campaign) throw new Error("Campaign not found");
  await setCampaignStatus(id, "running", workspaceId);
  const baseInput = { campaign, prospects: state.prospects.filter(x => x.campaignId === id), memory: recall(state, `${campaign.name} ${campaign.criteria.industries.join(" ")}`) };
  const firstPass = await runWorkers(baseInput);
  const researched = firstPass.find(x => x.workerId === "researcher")?.artifacts.prospects as Prospect[] | undefined;
  const prospects = researched || [];
  const secondPass = await runWorkers({ ...baseInput, prospects });
  const results = [...firstPass.filter(x => x.workerId === "researcher"), ...secondPass.filter(x => x.workerId !== "researcher")];
  const jobs: WorkerJob[] = results.map(result => newWorkerJob(id, result.workerId, result.status === "complete" ? "complete" : "failed", result.summary, result.artifacts));
  const memoryResults: MemoryItem[] = results
    .filter(result => result.workerId === "archivist" && typeof result.artifacts.text === "string")
    .map(result => ({ id: makeId("mem"), workspaceId, scope: "campaign", scopeId: campaign.id, text: String(result.artifacts.text), tags: Array.isArray(result.artifacts.tags) ? result.artifacts.tags.map(String) : ["campaign"], createdAt: nowIso() }));
  const events = [
    { ...audit("coworkers.completed", `${jobs.length} co-workers reported for ${campaign.name}`), workspaceId },
    { ...audit("campaign.completed", `${prospects.length} prospects processed`), workspaceId }
  ];
  const saved = await saveRunArtifacts(prospects, jobs, events, memoryResults, workspaceId);
  if (workspaceId) await exportMemoryFactory(workspaceId, id).catch(() => undefined);
  return saved;
}

export async function draftOutreach(prospectId: string, channel: "gmail" | "whatsapp", workspaceId?: string) {
  const state = await loadState(workspaceId);
  const prospect = state.prospects.find(x => x.id === prospectId);
  if (!prospect) throw new Error("Prospect not found");
  const campaign = state.campaigns.find(x => x.id === prospect.campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const identity = state.identity;
  const identityMissing = !identity?.businessName;
  const senderName = identity?.senderName || identity?.businessName || "your business";
  const fallbackBody = channel === "gmail"
    ? `Hello,\n\nI noticed ${prospect.businessName} fits the campaign focus around ${prospect.industry || "your sector"}. ${campaign.criteria.offer || "I have a practical idea that may be relevant to your team."}\n\nWould a short conversation be useful?\n`
    : appendTextSignature(`Hello — I noticed ${prospect.businessName} fits a current campaign focus. ${campaign.criteria.offer || "I have a practical idea that may be relevant."} Would a short conversation be useful?`, identity);
  const fallbackSubject = `A practical idea for ${prospect.businessName}`;
  const generated = await generateOutreachDraft(campaign, prospect, channel, identity);
  const body = channel === "whatsapp" ? appendTextSignature(generated.body || fallbackBody, identity) : generated.body || fallbackBody;
  const subject = generated.subject || fallbackSubject;
  const payload = {
    prospectId: prospect.id,
    to: channel === "gmail" ? prospect.email || "" : prospect.phone || "",
    subject: channel === "gmail" ? subject : undefined,
    body,
    draftSource: generated.source,
    channel,
    identityMissing,
    senderName,
    businessName: identity?.businessName || "",
    recipientMissing: channel === "gmail" ? !prospect.email : !prospect.phone
  };
  const now = nowIso();
  const approval: Approval = { id: makeId("apr"), kind: channel === "gmail" ? "email" : "whatsapp", status: "pending", title: `${channel} · ${prospect.businessName}`, payload, createdAt: now, updatedAt: now };

  if (identityMissing) {
    approval.payload = { ...approval.payload, setupRequired: "Add Business Identity in Setup before creating external-facing drafts." };
  } else if (channel === "gmail" && prospect.email) {
    const google = state.connections.find(connection => connection.provider === "google" && connection.status === "connected");
    if (google) {
      try {
        const draft = await createGmailDraft(prospect.email, subject, body, google, identity);
        if (draft.mode === "gmail_draft") {
          approval.status = "draft_created";
          approval.payload = { ...approval.payload, gmailDraft: draft, gmailDraftUrl: draft.url, gmailDraftId: draft.draftId };
        }
      } catch (error) {
        approval.status = "failed";
        approval.payload = { ...approval.payload, gmailDraftError: error instanceof Error ? error.message : String(error) };
      }
    }
  }

  return saveApproval(approval, workspaceId);
}

function appendTextSignature(body: string, identity?: WorkspaceIdentity) {
  const signature = identity?.defaultSignature?.trim();
  if (!signature || body.includes(signature)) return body;
  return `${body.trim()}\n\n${signature}`;
}

async function generateOutreachDraft(campaign: Campaign, prospect: Prospect, channel: "gmail" | "whatsapp", identity?: WorkspaceIdentity) {
  const prompt = [
    "Write supervised B2B outreach on behalf of the connected customer workspace, not on behalf of Loopaal.",
    "Use only the provided prospect and campaign facts. Do not invent revenue, clients, contact names, awards, or pain points.",
    "Use the provided sender/business identity naturally. Do not mention Loopaal unless it appears in the user's business identity or offer.",
    channel === "gmail" ? "Do not add an email signature; the connected sender signature is appended separately." : "If a short provided signature/footer exists, it may be used once at the end.",
    "Keep it concise, credible, and low-pressure. No spam wording, fake urgency, or exaggerated claims.",
    channel === "gmail"
      ? "Return strict JSON only with string fields: subject, body."
      : "Return strict JSON only with string field: body."
  ].join(" ");
  const input = JSON.stringify({
    channel,
    sender: {
      businessName: identity?.businessName || "",
      senderName: identity?.senderName || "",
      replyTo: identity?.replyTo || "",
      tone: identity?.defaultTone || "",
      websiteUrl: identity?.websiteUrl || "",
      signature: channel === "whatsapp" ? identity?.defaultSignature || "" : ""
    },
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

export async function approveAction(id: string, scheduledFor?: string, workspaceId?: string) {
  const state = await updateApproval(id, "approved", scheduledFor, workspaceId);
  return executeDue(state, workspaceId);
}

export async function rejectAction(id: string, workspaceId?: string) {
  return updateApproval(id, "rejected", undefined, workspaceId);
}

export async function requestWebsiteChange(data: Record<string, unknown>, workspaceId?: string) {
  const state = await loadState(workspaceId);
  const identity = state.identity;
  const now = nowIso();
  const approval: Approval = {
    id: makeId("apr"),
    kind: "website",
    status: "pending",
    title: `Website · ${String(data.title || "change request")}`,
    payload: { ...data, businessName: identity?.businessName || "", identityMissing: !identity?.businessName },
    createdAt: now,
    updatedAt: now
  };
  return saveApproval(approval, workspaceId);
}

export async function ingestReply(channel: "gmail" | "whatsapp", data: Record<string, unknown>) {
  return remember("conversation", String(data.threadId || data.from || makeId("thread")), JSON.stringify(data), [channel, "inbound"]);
}

export async function executeDue(state?: Awaited<ReturnType<typeof loadState>>, workspaceId?: string) {
  const current = state || await loadState(workspaceId);
  for (const approval of current.approvals.filter(x => x.status === "approved" && (!x.scheduledFor || new Date(x.scheduledFor).getTime() <= Date.now()))) {
    const p = approval.payload;
    const risk = outboundRisk(String(p.body || ""));
    if (risk.length || p.identityMissing) {
      await updateApproval(approval.id, "failed", undefined, workspaceId);
    } else {
      let result: Record<string, unknown> = {};
      if (approval.kind === "email") result = await sendGmail(String(p.to || ""), String(p.subject || ""), String(p.body || ""), current.connections.find(connection => connection.provider === "google"));
      if (approval.kind === "whatsapp") result = await sendWhatsApp(String(p.to || ""), String(p.body || ""), current.connections.find(connection => connection.provider === "whatsapp"));
      if (approval.kind === "website") result = await updateWebsite(p, current.connections.find(connection => connection.provider === "website"));
      const mode = String(result.mode || "");
      const status: Approval["status"] = mode === "preview" || mode === "demo" ? "previewed" : approval.kind === "website" ? "executed" : "sent";
      await patchApproval(approval.id, { status, payload: { executionResult: result } }, workspaceId);
    }
  }
  return loadState(workspaceId);
}
