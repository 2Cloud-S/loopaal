import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../../../../../src/lib/config.ts";
import { makeId, nowIso } from "../../../../../src/lib/ids.ts";
import { saveConnection } from "../../../../../src/lib/repository.ts";
import type { Connection } from "../../../../../src/types.ts";

export const runtime = "nodejs";

function callbackPage(title: string, body: string, href = "/setup") {
  return new NextResponse(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:12vh auto;padding:24px;line-height:1.5}a{color:#064ad8}</style></head><body><h1>${title}</h1><p>${body}</p><p><a href="${href}">Return to Loopaal setup</a></p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

async function fetchGoogleIdentity(accessToken: string, fallbackEmail = "") {
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => undefined);
  const profile = profileResponse?.ok ? await profileResponse.json() as { email?: string; name?: string; sub?: string } : {};
  const sendAsResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs", { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => undefined);
  const sendAsData = sendAsResponse?.ok ? await sendAsResponse.json() as { sendAs?: Array<{ sendAsEmail?: string; displayName?: string; replyToAddress?: string; signature?: string; isDefault?: boolean; isPrimary?: boolean }> } : {};
  const sendAs = sendAsData.sendAs?.find(item => item.isDefault) || sendAsData.sendAs?.find(item => item.isPrimary) || sendAsData.sendAs?.[0];
  const email = sendAs?.sendAsEmail || profile.email || fallbackEmail;
  return {
    displayName: sendAs?.displayName || profile.name || email,
    email,
    sendAsEmail: email,
    replyTo: sendAs?.replyToAddress || email,
    signature: sendAs?.signature || "",
    destinationLabel: profile.email ? `Google Drive owned by ${profile.email}` : "Connected Google Drive",
    providerAccountId: profile.sub || ""
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error");
  if (error) return callbackPage("Google connection was cancelled", `Google returned: ${error}`);
  if (!code) return callbackPage("Google connection failed", "No authorization code was returned.");
  if (!config.google.clientId || !config.google.clientSecret) return callbackPage("Google OAuth is not configured", "This deployment needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");

  let workspaceId = "";
  try {
    const parsed = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8")) as { workspaceId?: string; signature?: string };
    workspaceId = parsed.workspaceId || "";
    workspaceId = workspaceId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    const expected = createHmac("sha256", config.google.clientSecret).update(workspaceId).digest("hex");
    const provided = parsed.signature || "";
    if (!provided || provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
      return callbackPage("Google connection failed", "The workspace state could not be verified.");
    }
  } catch {
    return callbackPage("Google connection failed", "The workspace state could not be verified.");
  }
  if (!workspaceId) return callbackPage("Google connection failed", "The workspace id was missing.");

  const redirectUri = config.google.redirectUri || `${config.appUrl || url.origin}/api/connections/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  const tokenData = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenData.access_token) return callbackPage("Google connection failed", tokenData.error_description || "Google did not return an access token.");
  const identity = await fetchGoogleIdentity(tokenData.access_token);

  const now = nowIso();
  const connection: Connection = {
    id: makeId("con"),
    workspaceId,
    provider: "google",
    status: "connected",
    label: identity.sendAsEmail || identity.email || "Google Gmail + Drive",
    scopes: String(tokenData.scope || "").split(/\s+/).filter(Boolean),
    identity,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + Math.max(1, tokenData.expires_in || 3600) * 1000).toISOString(),
    createdAt: now,
    updatedAt: now
  };
  await saveConnection(connection);
  return callbackPage("Google connected", "This workspace can now use its own Google connection for Gmail/Drive actions.", "/dashboard");
}
