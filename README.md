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

With `LOOPAAL_STORE=demo`, loopaal uses local demo persistence. With `LOOPAAL_STORE=dynamodb` and AWS credentials, it writes to DynamoDB. Set `AI_PROVIDER=gemini` with `GEMINI_API_KEY` for Gemini-powered drafts, or leave `AI_PROVIDER=demo` for deterministic copy.

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

## Core demo flow

1. Complete workspace setup.
2. Create a campaign from volatile targeting criteria.
3. Launch co-workers in parallel.
4. Persist prospects, worker jobs, memory, approvals, and audit events.
5. Draft email or WhatsApp outreach. Gmail creates a real Gmail Draft when Google is connected and the prospect has a verified email.
6. Approve or reject the proposed action.

## Safety model

- Research and drafting may run automatically.
- Email, WhatsApp, and website changes require approval by default.
- Real external actions require `OUTBOUND_SENDS_LIVE=true`; otherwise approved actions remain non-destructive previews.
- Gmail should use a dedicated business mailbox and the `gmail.compose` scope, not a personal main inbox.
- Consumers connect Google from `/setup`; OAuth tokens are saved against their workspace, not treated as global sender identity.
- Demo mode never sends real external messages.
- Every meaningful transition is written to the audit log.
- Public-web research must respect source terms, privacy rules, opt-outs, and applicable anti-spam laws.
