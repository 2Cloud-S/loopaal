import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCriteria } from "../src/lib/criteria.ts";
import { canExecute, outboundRisk } from "../src/lib/policies.ts";
import { recall } from "../src/lib/memory.ts";
import { keysFor } from "../src/lib/dynamo-keys.ts";
import type { AppState } from "../src/types.ts";

test("volatile campaign criteria normalize from text", () => {
  const criteria = normalizeCriteria({ businessNames: "North Studio\nSouth Works", countries: "Pakistan, UAE", decisionMakers: "Founder" });
  assert.deepEqual(criteria.businessNames, ["North Studio", "South Works"]);
  assert.deepEqual(criteria.countries, ["Pakistan", "UAE"]);
});

test("only approved due actions execute", () => {
  assert.equal(canExecute("pending"), false);
  assert.equal(canExecute("approved", new Date(Date.now() + 60_000).toISOString()), false);
  assert.equal(canExecute("approved", new Date(Date.now() - 1_000).toISOString()), true);
});

test("outbound policy flags risky language", () => {
  assert.deepEqual(outboundRisk("We guarantee a risk-free result."), ["unverifiable claim"]);
});

test("memory retrieval ranks matching context", () => {
  const state: AppState = { campaigns: [], prospects: [], approvals: [], workerJobs: [], audit: [], connections: [], memories: [
    { id: "1", scope: "business", scopeId: "a", text: "Architecture studios prefer concise proposals", tags: ["architecture"], createdAt: "2026-01-01" },
    { id: "2", scope: "business", scopeId: "b", text: "Retail note", tags: ["retail"], createdAt: "2026-01-01" }
  ] };
  assert.equal(recall(state, "architecture proposal")[0].id, "1");
});

test("DynamoDB keys keep campaign records queryable", () => {
  const keys = keysFor({ entityType: "prospect", id: "pro_1", campaignId: "cmp_1", businessName: "North Studio", facts: [], sources: [], confidence: 0.6, updatedAt: "2026-06-25T00:00:00.000Z" });
  assert.equal(keys.pk, "CAMPAIGN#cmp_1");
  assert.equal(keys.sk, "PROSPECT#pro_1");
  assert.equal(keys.gsi1pk, "CAMPAIGN#cmp_1");
});
