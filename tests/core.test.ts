import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCriteria } from "../src/lib/criteria.ts";
import { canExecute, outboundRisk } from "../src/lib/policies.ts";
import { recall } from "../src/lib/memory.ts";
import { keysFor } from "../src/lib/dynamo-keys.ts";
import { memoryFactoryStatus, memoryToSheetRow, parseMemorySheetRows, parseProspectSheetRows, prospectToSheetRow } from "../src/lib/memory-factory.ts";
import type { AppState, Connection } from "../src/types.ts";

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

test("Memory Factory status requires folder and spreadsheet metadata", () => {
  const connection: Connection = {
    id: "con_1",
    workspaceId: "ws_1",
    provider: "google",
    status: "connected",
    scopes: [],
    label: "owner@example.com",
    identity: { memoryFactoryEnabled: true, driveFolderId: "fld", spreadsheetId: "sheet", driveFolderUrl: "drive", spreadsheetUrl: "sheets" },
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01"
  };
  assert.equal(memoryFactoryStatus(connection).enabled, true);
  assert.equal(memoryFactoryStatus({ ...connection, identity: { memoryFactoryEnabled: true } }).enabled, false);
});

test("Memory Factory maps canonical rows into editable sheet rows", () => {
  const memoryRow = memoryToSheetRow({ id: "mem_1", scope: "campaign", scopeId: "cmp_1", text: "Useful context", tags: ["campaign", "cmp_1"], createdAt: "2026-01-01" });
  assert.deepEqual(memoryRow.slice(0, 5), ["mem_1", "campaign", "cmp_1", "Useful context", "campaign, cmp_1"]);
  const prospectRow = prospectToSheetRow({ id: "pro_1", campaignId: "cmp_1", businessName: "North Studio", website: "https://north.example", email: "a@b.com", phone: "+123", notes: "warm", facts: [], sources: [], confidence: 0.7, updatedAt: "2026-01-01" });
  assert.equal(prospectRow[0], "pro_1");
  assert.equal(prospectRow[8], "a@b.com");
  assert.equal(prospectRow[11], "warm");
});

test("Memory Factory parses only editable sheet fields", () => {
  const memory = parseMemorySheetRows([
    ["id", "scope", "scopeId", "text", "tags", "source", "status", "createdAt", "updatedAt"],
    ["mem_1", "campaign", "cmp_1", "Edited", "campaign, edited", "sheet", "active", "old", "new"]
  ]);
  assert.deepEqual(memory[0], { kind: "memory", id: "mem_1", text: "Edited", tags: ["campaign", "edited"], status: "active" });
  const prospects = parseProspectSheetRows([
    ["id", "campaignId", "businessName", "website", "industry", "country", "contactName", "contactRole", "email", "phone", "confidence", "notes", "updatedAt"],
    ["pro_1", "cmp_1", "North", "https://north.example", "ignored", "ignored", "A", "Founder", "a@b.com", "+1 (555)", "0.1", "edited note", "ignored"]
  ]);
  assert.deepEqual(prospects[0], { kind: "prospect", id: "pro_1", website: "https://north.example", contactName: "A", contactRole: "Founder", email: "a@b.com", phone: "+1555", notes: "edited note" });
});
