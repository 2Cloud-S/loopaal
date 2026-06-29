# loopaal

loopaal is a supervised AI revenue-ops automation platform for the H0 Vercel + AWS Databases hackathon. It targets **Track 2: Monetizable B2B App** and demonstrates parallel co-workers, DynamoDB-backed memory, approval-gated outreach, and a Vercel-ready Next.js dashboard.

## Run locally

Requires Node.js 24+.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`. The product starts with workspace setup, then moves users into `/dashboard`.

With `LOOPAAL_STORE=demo`, loopaal uses local demo persistence. With `LOOPAAL_STORE=dynamodb` and AWS credentials, it writes to DynamoDB. Platform AI keys are used only for Loopaal's limited trial AI; customer-owned long-term AI must use OAuth or a secure server-side vault, never raw API keys in the app database.

Set `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` to enable Supabase Auth. Without those variables, Loopaal keeps a local demo workspace fallback for development.

External sends are safe by default. Gmail, WhatsApp, and website updates run in preview mode unless `OUTBOUND_SENDS_LIVE=true` is set for a workspace with owned channel credentials.

With Supabase enabled, each signed-in user gets an isolated workspace. API routes resolve the workspace from the server-verified Supabase session. Local-storage workspace IDs are used only in demo auth mode.

## Hackathon docs

- [PRD.md](./PRD.md)
- [TRD.md](./TRD.md)
- [Architecture.md](./Architecture.md)
- [WORKERS.md](./WORKERS.md)
- [PROJECT_RULES.md](./PROJECT_RULES.md)
- [PLANNING.md](./PLANNING.md)
- [AWS.md](./AWS.md)
- [VERCEL.md](./VERCEL.md)
- [GMAIL.md](./GMAIL.md)
- [MEMORY_FACTORY.md](./MEMORY_FACTORY.md)
- [WEBSITE_WEBHOOKS.md](./WEBSITE_WEBHOOKS.md)

## Hybrid memory model

DynamoDB is Loopaal’s canonical operational database. Google Drive/Sheets is a customer-owned Memory Factory: an optional context engineering layer where users can view, edit, export, and re-import memory.

The core workflow uses DynamoDB for campaigns, prospects, approvals, audit, and normalized memory. Advanced memory management unlocks only after a user connects Google Drive/Sheets from `/setup`; until then, campaigns still work, but customer-editable memory export/import remains locked.

## Core demo flow

1. Complete workspace setup.
2. Create a campaign from volatile targeting criteria.
3. Launch co-workers in parallel.
4. Persist prospects, worker jobs, memory, approvals, and audit events.
5. Draft email or WhatsApp outreach. Gmail creates a real Gmail Draft when Google is connected and the prospect has a verified email.
6. Approve or reject the proposed action.

## Safety model

- Research and drafting may run automatically.
- Loopaal trial AI is limited to 5 campaigns per workspace; after that, customers must connect a secure AI provider.
- Customer AI credentials must use OAuth or a secure vault reference. Raw AI API keys are not stored in DynamoDB, local storage, or session storage.
- Email, WhatsApp, and website changes require approval by default.
- Real external actions require `OUTBOUND_SENDS_LIVE=true`; otherwise approved actions remain non-destructive previews.
- Gmail should use a dedicated business mailbox and the `gmail.compose` scope, not a personal main inbox.
- Consumers connect Google from `/setup`; OAuth tokens are saved against their workspace, not treated as global sender identity.
- Website updates use a signed HTTPS webhook contract. Cloudflare Workers are supported for the demo, but customers can connect any platform that can verify `X-Loopaal-Signature`.
- Demo mode never sends real external messages.
- Every meaningful transition is written to the audit log.
- Public-web research must respect source terms, privacy rules, opt-outs, and applicable anti-spam laws.
