import { NextResponse } from "next/server";
import { config } from "../../../../../src/lib/config.ts";

export const runtime = "nodejs";

const scopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets"
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = (url.searchParams.get("workspaceId") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!workspaceId) return NextResponse.json({ error: "Missing workspace id" }, { status: 400 });
  if (!config.google.clientId) return NextResponse.json({ error: "Google OAuth client is not configured for this deployment" }, { status: 400 });
  const state = Buffer.from(JSON.stringify({ workspaceId })).toString("base64url");
  const redirectUri = `${url.origin}/api/connections/google/callback`;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", config.google.clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", scopes.join(" "));
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("state", state);
  return NextResponse.redirect(auth);
}
