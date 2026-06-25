# VERCEL — Deployment Guide

## Project settings

- Framework preset: Next.js.
- Build command: `npm run build`.
- Output: default Vercel Next.js output.
- Node runtime: 24.x where available.

## Environment variables

Set the variables from `.env.example`, especially:

- `LOOPAAL_STORE=dynamodb`
- `LOOPAAL_TABLE_NAME`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-2.5-flash`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GMAIL_SENDER`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Submission checklist

- Published Vercel project link.
- Vercel Team ID.
- Architecture diagram from `Architecture.md`.
- AWS DynamoDB screenshot from `AWS.md`.
- Demo video under three minutes.

## Judge-friendly note

If private credentials are unavailable during judging, set `LOOPAAL_STORE=demo` and `NEXT_PUBLIC_LOOPAAL_DEMO=true`. The app will still demonstrate the full workflow without transmitting external messages.
