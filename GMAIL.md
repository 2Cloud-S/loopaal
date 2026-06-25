# Gmail API setup for Loopaal

Loopaal supports Gmail sending through either a short-lived `GOOGLE_ACCESS_TOKEN` or a safer refresh-token setup. For demos and Vercel deployments, prefer refresh tokens so the app can request fresh access tokens automatically.

## Recommended privacy setup

Do not use your personal main Gmail inbox as the product identity. Create a dedicated mailbox such as `loopaal.outreach@gmail.com` or `loopaal@yourdomain.com`, then connect only that mailbox to Loopaal.

Recommended controls:

- Use the narrow Gmail scope: `https://www.googleapis.com/auth/gmail.send`.
- Keep sends approval-gated with `AUTO_APPROVE_SEND=false`.
- Do not enable inbox-reading scopes for the hackathon unless the demo explicitly needs reply ingestion.
- Keep credentials only in `.env` and Vercel environment variables.
- If you use a Google Workspace domain, use a sender alias like `outreach@yourdomain.com` rather than a personal address.

## Google Cloud OAuth client

Create an OAuth client ID with application type `Web application`.

Authorized JavaScript origins:

```txt
http://localhost:3000
https://your-loopaal-vercel-url.vercel.app
```

Authorized redirect URIs for OAuth Playground token generation:

```txt
https://developers.google.com/oauthplayground
```

If Loopaal later adds an in-app OAuth callback, add these too:

```txt
http://localhost:3000/api/auth/google/callback
https://your-loopaal-vercel-url.vercel.app/api/auth/google/callback
```

## Required APIs and scopes

Enable the Gmail API in Google Cloud.

Use this scope for sending only:

```txt
https://www.googleapis.com/auth/gmail.send
```

Only add read scopes later if reply ingestion becomes part of the judged demo.

## Get a refresh token with OAuth Playground

1. Open https://developers.google.com/oauthplayground.
2. Click the gear icon.
3. Enable `Use your own OAuth credentials`.
4. Paste your Google OAuth client ID and client secret.
5. In the left panel, enter or select:

```txt
https://www.googleapis.com/auth/gmail.send
```

6. Click `Authorize APIs`.
7. Sign in with the dedicated Loopaal sending mailbox.
8. Exchange the authorization code for tokens.
9. Copy the refresh token into `.env`.

## Environment variables

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GMAIL_SENDER=loopaal.outreach@gmail.com
```

`GOOGLE_ACCESS_TOKEN` is optional when the refresh-token variables are present.

## Test behavior

When an approved email action executes, Loopaal refreshes the Gmail access token in memory, sends through Gmail API, and does not persist the short-lived access token.
