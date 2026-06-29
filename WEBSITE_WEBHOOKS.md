# Website webhooks

Loopaal website actions are platform-agnostic. A customer does not need Cloudflare specifically; they only need an HTTPS endpoint that accepts a signed `POST` request.

## Contract

Loopaal sends approved website actions to the workspace's saved website connection:

- Method: `POST`
- Header: `Content-Type: application/json`
- Header: `X-Loopaal-Signature: <hex hmac sha256>`
- Header: `X-Loopaal-Actor: <workspace/business identity>`
- Body: JSON payload describing the approved change

The signature is:

```txt
hex_hmac_sha256(shared_webhook_secret, raw_request_body)
```

The receiver must verify the signature against the raw request body before applying or storing the update.

## Supported customer platforms

Any customer-owned platform can work if it can expose a signed HTTPS endpoint:

- Cloudflare Workers or Pages Functions
- Vercel, Netlify, Render, Railway, Fly.io, or custom servers
- WordPress, Shopify, Webflow, or CMS middleware through a small API bridge
- Make, Zapier, or n8n webhooks when a verification step is added before mutation

Cloudflare is Loopaal's demo recipe, not a product requirement.

## Cloudflare Worker recipe

Create a Worker and add this code:

```js
export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.text();
    const receivedSignature = request.headers.get("X-Loopaal-Signature") || "";
    const expectedSignature = await hmacHex(env.LOOPAAL_WEBHOOK_SECRET, body);

    if (!safeEqual(receivedSignature, expectedSignature)) {
      return Response.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const change = JSON.parse(body);

    if (env.LOOPAAL_SITE_UPDATES) {
      await env.LOOPAAL_SITE_UPDATES.put("latest", JSON.stringify({
        ...change,
        receivedAt: new Date().toISOString()
      }));
    }

    return Response.json({ ok: true, received: true });
  }
};

async function hmacHex(secret, body) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return [...new Uint8Array(signature)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}
```

Recommended Cloudflare settings:

1. Add secret `LOOPAAL_WEBHOOK_SECRET`.
2. Optional: create a KV namespace named `LOOPAAL_SITE_UPDATES` and bind it to the Worker.
3. Use either the Worker URL or a custom route such as `https://yourdomain.com/api/loopaal`.
4. In Loopaal `/setup`, save the same webhook URL and secret.
5. Use **Test webhook** before enabling live website actions.

## Runtime safety

- Loopaal queues website changes as approvals first.
- Real calls happen only after approval and only when `OUTBOUND_SENDS_LIVE=true`.
- Failed webhook calls should be visible in the approval/audit flow.
- The website endpoint decides whether to store, publish, or ignore each signed change.
