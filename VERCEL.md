# VERCEL - Deployment Guide

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
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if using Supabase's newer publishable keys instead of legacy anon keys
- `SUPABASE_SERVICE_ROLE_KEY` if later needed for server-only admin operations
- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-2.5-flash`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://your-loopaal-vercel-url.vercel.app/api/connections/google/callback`
- `OUTBOUND_SENDS_LIVE=false` for safe preview mode; set `true` only for a workspace with owned outbound channels.
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Deployment verification checklist

- Published Vercel project link.
- Vercel project settings and environment variables are configured.
- Architecture diagram from `Architecture.md`.
- AWS DynamoDB connectivity verified from `AWS.md`.
- Google Cloud OAuth redirect URI exactly matches the production callback URL.
- Supabase Auth project URL/anon key are configured in Vercel.

## Safe preview note

Keep `OUTBOUND_SENDS_LIVE=false` unless you are deliberately enabling live sends for a workspace with customer-owned channels. Preview mode is controlled by approval/live-action policy, not by a public sample-data flag.
