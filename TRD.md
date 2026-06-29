# TRD — loopaal Technical Requirements

## Runtime

- Frontend and API: Next.js App Router on Vercel.
- Language: TypeScript.
- Database: AWS DynamoDB single-table design.
- AI provider: Loopaal-owned trial AI for 5 campaigns per workspace, then customer-owned OAuth/secure-vault AI connection.
- Outbound mode: external sends run as previews unless `OUTBOUND_SENDS_LIVE=true`.
- Workspace isolation: browser workspaces send `x-loopaal-workspace`; API state is scoped to that workspace.
- Worker ecosystem: separate local package intended to become the `workers` GitHub repo/submodule.

## Core API surface

- `GET /api/state` — dashboard state and integration status.
- `POST /api/campaigns` — create a campaign.
- `POST /api/campaigns/[id]/run` — run co-workers in parallel.
- `POST /api/drafts` — create email or WhatsApp approval draft.
- `POST /api/approvals/[id]/approve` — approve and optionally schedule an action.
- `POST /api/approvals/[id]/reject` — reject an action.
- `POST /api/memory` — save durable context.
- `POST /api/website-changes` — queue a website update approval.
- `POST /api/connections/website/test` — send a signed test payload to a customer-owned website webhook.
- `POST /api/connections/ai/start` — begin a secure customer-owned AI OAuth/vault connection flow; raw API keys are rejected.
- `POST /api/connections/ai/disconnect` — revoke workspace AI metadata and secret references.
- `POST /api/webhooks/gmail` and `/api/webhooks/whatsapp` — ingest replies.
- `GET /setup` — customer-facing workspace setup and integration readiness.
- `GET /api/connections/google/start` and `/callback` — Google OAuth for workspace-owned Gmail/Drive access.

## Persistence requirements

- Production mode uses DynamoDB when `LOOPAAL_STORE=dynamodb`.
- Demo mode uses a local JSON file so the project can run without credentials.
- All state mutations must create audit events.
- Failed workers must create visible audit entries instead of failing the whole run.
- Draft generation must fall back to deterministic copy if an AI provider is unavailable.
- Platform AI/database services may be shared by the deployment, but outbound channels must be workspace-owned before live execution.
- Platform AI is limited to the workspace trial. Customer AI secrets must be OAuth tokens or secure-vault references, never raw keys stored in DynamoDB or browser storage.
- Website integrations must stay provider-agnostic: Loopaal stores an HTTPS webhook URL and shared signing secret, not a Cloudflare-specific connection.

## Safety requirements

- Do not invent contact details.
- Research output must separate verified facts from unknowns.
- External sends and website updates are approval-gated by default.
- Approval alone is not enough for live execution; live outbound mode must also be enabled.
- Outbound messages are scanned for unverifiable claims and sensitive-data requests.

## Future Memory Factory API surface

Memory Factory APIs are optional advanced memory-management routes. They require an authenticated workspace plus a workspace-owned Google connection with Drive/Sheets permissions.

- `POST /api/memory-factory/setup` — create or reuse the customer-owned Drive folder and Google Sheet.
- `GET /api/memory-factory/status` — return Memory Factory readiness, Drive folder link, Sheet link, and last sync status.
- `POST /api/memory-factory/export` — export DynamoDB memory/context to Drive/Sheets.
- `POST /api/memory-factory/import` — validate user-edited Sheet rows before updating DynamoDB.
- `GET /api/memory-factory/context` — list retrievable Drive context snapshots.
- `POST /api/memory-factory/context` — save a named Drive context snapshot from canonical DynamoDB state.

## Hybrid persistence requirements

- DynamoDB is the canonical source of truth for app data.
- Drive/Sheets is an optional customer-owned Memory Factory for editable/exportable context management, not the production database.
- Memory Factory features require the user to connect Google and grant Drive/Sheets permissions.
- Campaign data must persist to DynamoDB before any Drive/Sheets export runs.
- Drive/Sheets sync failures must create visible audit events and must not fail the core campaign workflow after DynamoDB persistence succeeds.
