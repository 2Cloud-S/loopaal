import test from "node:test";
import assert from "node:assert/strict";
import { runWorkers, workers } from "../workers/src/index.ts";
import type { Campaign } from "../src/types.ts";

const campaign: Campaign = {
  id: "cmp_test",
  name: "Test campaign",
  status: "draft",
  createdAt: "2026-06-25T00:00:00.000Z",
  criteria: {
    businessNames: ["North Studio", "South Works"],
    industries: ["Architecture"],
    countries: ["Pakistan"],
    decisionMakers: ["Founder"],
    offer: "Approval-safe automation",
    notes: "Tone adapts to business data"
  }
};

test("workers expose stable contracts", () => {
  assert.deepEqual(workers.map(worker => worker.workerId), ["researcher", "analyst", "writer", "archivist", "scheduler", "reply-handler"]);
});

test("worker run returns prospects and completed statuses", async () => {
  const results = await runWorkers({ campaign, prospects: [], memory: [] });
  assert.equal(results.every(result => result.status === "complete"), true);
  const researcher = results.find(result => result.workerId === "researcher");
  assert.equal(Array.isArray(researcher?.artifacts.prospects), true);
});
