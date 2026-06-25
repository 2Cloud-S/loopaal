import type { LoopaalWorker, WorkerInput, WorkerResult } from "./types.ts";
import type { Prospect } from "../../src/types.ts";

function makeProspect(input: WorkerInput, businessName: string, index: number): Prospect {
  const now = new Date().toISOString();
  return {
    id: `pro_${crypto.randomUUID().slice(0, 8)}`,
    campaignId: input.campaign.id,
    businessName,
    industry: input.campaign.criteria.industries[index] || input.campaign.criteria.industries[0] || "Unverified industry",
    country: input.campaign.criteria.countries[index] || input.campaign.criteria.countries[0] || "Unverified country",
    contactRole: input.campaign.criteria.decisionMakers[0] || "Decision maker",
    facts: [
      "Seeded from operator-provided criteria.",
      "Contact details intentionally left blank unless verified by a connected research source."
    ],
    sources: ["operator brief"],
    confidence: 0.62,
    updatedAt: now
  };
}

export const researcher: LoopaalWorker = {
  workerId: "researcher",
  description: "Creates verified-safe prospect shells from campaign criteria.",
  async run(input) {
    const names = input.campaign.criteria.businessNames.length ? input.campaign.criteria.businessNames : ["Example prospect"];
    const prospects = names.map((name, index) => makeProspect(input, name, index));
    return { workerId: "researcher", status: "complete", summary: `${prospects.length} prospects prepared`, artifacts: { prospects }, audit: ["researcher.completed"] };
  }
};

export const analyst: LoopaalWorker = {
  workerId: "analyst",
  description: "Scores fit and proposes outreach angle.",
  async run(input) {
    const angle = input.campaign.criteria.offer
      ? `Lead with the operator offer: ${input.campaign.criteria.offer}`
      : "Lead with a low-pressure discovery question.";
    return { workerId: "analyst", status: "complete", summary: "Fit scoring ready", artifacts: { score: 0.72, angle }, audit: ["analyst.completed"] };
  }
};

export const writer: LoopaalWorker = {
  workerId: "writer",
  description: "Drafts respectful outreach from verified context.",
  async run(input) {
    const first = input.prospects[0];
    const business = first?.businessName || input.campaign.criteria.businessNames[0] || "your team";
    const body = `Hello — I noticed ${business} matches the focus for this campaign. ${input.campaign.criteria.offer || "I have a practical idea that may be relevant."}\n\nWould a short conversation be useful?`;
    return { workerId: "writer", status: "complete", summary: "Draft angle prepared", artifacts: { subject: `A practical idea for ${business}`, body }, audit: ["writer.completed"] };
  }
};

export const archivist: LoopaalWorker = {
  workerId: "archivist",
  description: "Turns a campaign run into reusable memory.",
  async run(input) {
    const text = `Campaign ${input.campaign.name}: target ${input.campaign.criteria.industries.join(", ") || "general B2B"} in ${input.campaign.criteria.countries.join(", ") || "unspecified regions"}.`;
    return { workerId: "archivist", status: "complete", summary: "Memory capsule prepared", artifacts: { text, tags: ["campaign", input.campaign.id] }, audit: ["archivist.completed"] };
  }
};

export const scheduler: LoopaalWorker = {
  workerId: "scheduler",
  description: "Prepares follow-up scheduling suggestions.",
  async run() {
    const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return { workerId: "scheduler", status: "complete", summary: "Follow-up window suggested", artifacts: { scheduledFor }, audit: ["scheduler.completed"] };
  }
};

export const replyHandler: LoopaalWorker = {
  workerId: "reply-handler",
  description: "Classifies inbound replies and proposes next actions.",
  async run() {
    return { workerId: "reply-handler", status: "complete", summary: "Ready to classify inbound replies", artifacts: { categories: ["interested", "not-now", "unsubscribe", "needs-human"] }, audit: ["reply-handler.ready"] };
  }
};

export const workers = [researcher, analyst, writer, archivist, scheduler, replyHandler];

export async function runWorkers(input: WorkerInput): Promise<WorkerResult[]> {
  const settled = await Promise.allSettled(workers.map(worker => worker.run(input)));
  return settled.map((item, index) => item.status === "fulfilled"
    ? item.value
    : { workerId: workers[index].workerId, status: "failed", summary: "Worker failed", artifacts: {}, audit: ["worker.failed"] });
}

export type { LoopaalWorker, WorkerInput, WorkerResult };
