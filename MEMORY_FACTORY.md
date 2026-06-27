# MEMORY_FACTORY — Hybrid Memory Architecture

## Core decision

DynamoDB is Loopaal’s canonical operational database. Google Drive/Sheets is a customer-owned Memory Factory: an optional context engineering layer where users can view, edit, export, and re-import memory.

If Drive/Sheets is not connected, campaigns, approvals, audit, and memory still work through DynamoDB, but advanced user-editable memory management remains locked.

## Storage roles

- DynamoDB stores the canonical state for campaigns, prospects, worker jobs, approvals, audit events, connections, workspace identity, and normalized memory.
- Google Drive stores customer-accessible context snapshots, usually JSON files that package campaign context, worker outputs, memory capsules, and audit summaries.
- Google Sheets stores editable memory and prospect context rows so customers can inspect, correct, export, or enrich their context outside Loopaal.
- Drive/Sheets must never become the only copy of user data or replace DynamoDB as the production source of truth.

## Feature gating

Memory Factory features are available only after the customer connects Google from `/setup` and grants Drive/Sheets permissions.

Before Memory Factory is enabled:

- campaigns can run;
- co-workers can create prospects and memory;
- approvals and audit logs work;
- DynamoDB remains the source of truth;
- Drive/Sheets editing, export, import, and advanced context-management controls stay hidden or locked behind setup.

After Memory Factory is enabled:

- users can open their own Drive folder and Sheet;
- Loopaal can export selected memory/context from DynamoDB to Drive/Sheets;
- users can edit allowed fields in Sheets;
- Loopaal can import edited rows back through validation before updating DynamoDB;
- sync status and failures must be visible in the audit trail.

## Sync principles

- Write to DynamoDB first, then sync to Drive/Sheets.
- A Drive/Sheets sync failure must not fail a campaign run.
- Every export/import attempt should create an audit event.
- User-edited Sheet data is untrusted input until validated.
- Protected identifiers and timestamps should remain reference fields, not casual editable fields.
- Re-import should update only explicitly allowed fields such as memory text/tags, prospect contact fields, notes, and status.

## Future API shape

- `POST /api/memory-factory/setup` — create or reuse the user-owned Drive folder and Sheet.
- `GET /api/memory-factory/status` — report whether the workspace has an enabled Memory Factory.
- `POST /api/memory-factory/export` — export DynamoDB memory/context to Drive/Sheets.
- `POST /api/memory-factory/import` — validate Sheet edits and update DynamoDB.
- `GET /api/memory-factory/context` — list retrievable Drive context snapshots.
- `POST /api/memory-factory/context` — save a new context snapshot.

All routes must resolve the workspace from the authenticated Supabase session or demo workspace fallback and require the workspace-owned Google connection.

## Suggested Sheet tabs

- `Memory`: id, scope, scopeId, text, tags, source, status, createdAt, updatedAt.
- `Prospects`: id, campaignId, businessName, website, industry, country, contactName, contactRole, email, phone, confidence, notes, updatedAt.
- `Campaign Context`: campaignId, campaignName, criteria, offer, notes, workerSummary, createdAt.
- `Audit Export`: id, actor, action, detail, createdAt.

## Future-session instruction

Before changing memory, Drive, Sheets, context retrieval, or campaign persistence behavior, read this file first. The key invariant is simple: DynamoDB is canonical; Drive/Sheets is optional customer-owned memory management.
