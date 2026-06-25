# loopaal

loopaal is a supervised AI revenue-ops automation platform for the H0 Vercel + AWS Databases hackathon. It targets **Track 2: Monetizable B2B App** and demonstrates parallel co-workers, DynamoDB-backed memory, approval-gated outreach, and a Vercel-ready Next.js dashboard.

## Run locally

Requires Node.js 24+.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`. With `LOOPAAL_STORE=demo`, loopaal uses local demo persistence. With `LOOPAAL_STORE=dynamodb` and AWS credentials, it writes to DynamoDB.

## Hackathon docs

- [PRD.md](./PRD.md)
- [TRD.md](./TRD.md)
- [Architecture.md](./Architecture.md)
- [WORKERS.md](./WORKERS.md)
- [PROJECT_RULES.md](./PROJECT_RULES.md)
- [PLANNING.md](./PLANNING.md)
- [AWS.md](./AWS.md)
- [VERCEL.md](./VERCEL.md)

## Core demo flow

1. Create a campaign from volatile targeting criteria.
2. Launch co-workers in parallel.
3. Persist prospects, worker jobs, memory, approvals, and audit events.
4. Draft email or WhatsApp outreach.
5. Approve or reject the proposed action.

## Safety model

- Research and drafting may run automatically.
- Email, WhatsApp, and website changes require approval by default.
- Demo mode never sends real external messages.
- Every meaningful transition is written to the audit log.
- Public-web research must respect source terms, privacy rules, opt-outs, and applicable anti-spam laws.
