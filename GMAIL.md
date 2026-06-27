# Gmail API setup for Loopaal

Loopaal now uses Gmail as a customer-owned draft workspace. The default email flow creates a real Gmail Draft from `/setup`-connected Google accounts, then keeps any direct sending approval-gated.

## Recommended privacy setup

Do not use a personal main inbox as the product identity. Create or connect a dedicated business mailbox such as `loopaal.outreach@gmail.com` or `outreach@yourdomain.com`.

Recommended controls:

- Use the narrow draft scope: `https://www.googleapis.com/auth/gmail.compose`.
- Keep sends approval-gated with `AUTO_APPROVE_SEND=false`.
- Do not add inbox-reading scopes unless reply ingestion is intentionally implemented.
- Keep credentials only in `.env` and Vercel environment variables.
- Let each consumer connect their own Google account from `/setup`; do not share the founder’s mailbox across customers.

## Google Cloud OAuth client

Create an OAuth client ID with application type `Web application`.

Authorized JavaScript origins:

```txt
http://localhost:3000
https://your-loopaal-vercel-url.vercel.app
```

Authorized redirect URIs:

```txt
http://localhost:3000/api/connections/google/callback
https://your-loopaal-vercel-url.vercel.app/api/connections/google/callback
```

The redirect URI must exactly match `GOOGLE_REDIRECT_URI` or the URL derived from `NEXT_PUBLIC_APP_URL`. A mismatch causes Google’s `redirect_uri_mismatch` error.

## Required APIs and scopes

Enable the Gmail API in Google Cloud.

Loopaal requests:

```txt
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/spreadsheets
```

Only add `https://www.googleapis.com/auth/gmail.send` if you intentionally support direct sending after approval.

## Environment variables

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/connections/google/callback
```

Consumer Google refresh tokens are saved as workspace connections after OAuth. `GOOGLE_REFRESH_TOKEN` is optional legacy/demo fallback only.

## Test behavior

After a prospect has a verified email and Google is connected, clicking `Draft email` creates:

1. a Loopaal approval/audit record, and
2. a real Gmail Draft in the connected mailbox.

If no recipient email exists, Loopaal creates only an internal editable draft and marks the recipient as missing.
