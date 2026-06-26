# TRD — loopaal Technical Requirements

## Runtime

- Frontend and API: Next.js App Router on Vercel.
- Language: TypeScript.
- Database: AWS DynamoDB single-table design.
- AI provider: configurable provider adapter with Gemini, OpenAI, and deterministic demo fallback.
- Outbound mode: external sends run as previews unless `OUTBOUND_SENDS_LIVE=true`.
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
- `POST /api/webhooks/gmail` and `/api/webhooks/whatsapp` — ingest replies.
- `GET /setup` — customer-facing workspace setup and integration readiness.

## Persistence requirements

- Production mode uses DynamoDB when `LOOPAAL_STORE=dynamodb`.
- Demo mode uses a local JSON file so the project can run without credentials.
- All state mutations must create audit events.
- Failed workers must create visible audit entries instead of failing the whole run.
- Draft generation must fall back to deterministic copy if an AI provider is unavailable.
- Platform AI/database services may be shared by the deployment, but outbound channels must be workspace-owned before live execution.

## Safety requirements

- Do not invent contact details.
- Research output must separate verified facts from unknowns.
- External sends and website updates are approval-gated by default.
- Approval alone is not enough for live execution; live outbound mode must also be enabled.
- Outbound messages are scanned for unverifiable claims and sensitive-data requests.
