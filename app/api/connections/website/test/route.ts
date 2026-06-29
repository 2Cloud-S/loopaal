import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { loadState } from "../../../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

function cleanUrl(value: unknown) {
  const url = String(value || "").trim();
  if (!url) throw new Error("Webhook receiver URL is required");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Webhook receiver URL must be a valid HTTPS URL, for example https://loopaal-webhook.example.workers.dev");
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("Webhook receiver URL must use HTTPS");
  }
  return parsed.toString();
}

export async function POST(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    const data = await request.json();
    const existing = (await loadState(workspaceId)).connections.find(connection => connection.provider === "website" && connection.status === "connected");
    const webhookUrl = cleanUrl(data.webhookUrl || existing?.identity?.webhookUrl);
    const secret = String(data.webhookSecret || existing?.accessToken || "").trim();
    if (secret.length < 12) throw new Error("Use a webhook secret with at least 12 characters");

    const payload = {
      type: "loopaal.webhook_test",
      title: "Loopaal website webhook test",
      operation: "test",
      path: "/",
      content: "If you can see this request, the signed webhook connection is reachable.",
      actor: String(data.businessName || "workspace"),
      domain: String(data.domain || ""),
      workspaceId,
      sentAt: new Date().toISOString()
    };
    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Loopaal-Signature": signature,
        "X-Loopaal-Actor": payload.actor,
        "X-Loopaal-Test": "true"
      },
      body
    });
    const text = await response.text();
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      response: text.slice(0, 1000)
    }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Webhook test failed" }, { status: 400 });
  }
}
