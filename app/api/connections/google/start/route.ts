import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { config } from "../../../../../src/lib/config.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

const scopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets"
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = await workspaceFromRequest(request);
    if (!config.google.clientId || !config.google.clientSecret) return NextResponse.json({ error: "Google OAuth client is not configured for this deployment" }, { status: 400 });
    const signature = createHmac("sha256", config.google.clientSecret).update(workspaceId).digest("hex");
    const state = Buffer.from(JSON.stringify({ workspaceId, signature })).toString("base64url");
    const redirectUri = config.google.redirectUri || `${config.appUrl || url.origin}/api/connections/google/callback`;
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.searchParams.set("client_id", config.google.clientId);
    auth.searchParams.set("redirect_uri", redirectUri);
    auth.searchParams.set("response_type", "code");
    auth.searchParams.set("scope", scopes.join(" "));
    auth.searchParams.set("access_type", "offline");
    auth.searchParams.set("prompt", "consent");
    auth.searchParams.set("state", state);
    return NextResponse.redirect(auth);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
