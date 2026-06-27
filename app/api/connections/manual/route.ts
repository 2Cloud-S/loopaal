import { NextResponse } from "next/server";
import { makeId, nowIso } from "../../../../src/lib/ids.ts";
import { saveConnection } from "../../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";
import type { Connection } from "../../../../src/types.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    const data = await request.json();
    const provider = data.provider === "website" ? "website" : data.provider === "whatsapp" ? "whatsapp" : undefined;
    if (!provider) return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    const now = nowIso();
    const identity = provider === "whatsapp" ? {
      businessName: String(data.businessName || ""),
      displayName: String(data.businessName || "WhatsApp Business"),
      phoneNumber: String(data.phoneNumber || ""),
      phoneNumberId: String(data.phoneNumberId || ""),
      providerAccountId: String(data.phoneNumberId || "")
    } : {
      businessName: String(data.businessName || ""),
      displayName: String(data.businessName || "Website"),
      domain: String(data.domain || ""),
      webhookUrl: String(data.webhookUrl || ""),
      destinationLabel: String(data.domain || data.webhookUrl || "Website webhook")
    };
    const connection: Connection = {
      id: makeId("con"),
      workspaceId,
      provider,
      status: "connected",
      label: provider === "whatsapp" ? String(data.phoneNumberId || "WhatsApp Business") : String(data.webhookUrl || "Website webhook"),
      scopes: provider === "whatsapp" ? ["whatsapp.messages"] : ["website.webhook"],
      identity,
      accessToken: provider === "whatsapp" ? String(data.accessToken || "") : String(data.webhookSecret || ""),
      refreshToken: provider === "whatsapp" ? String(data.verifyToken || "") : undefined,
      createdAt: now,
      updatedAt: now
    };
    return NextResponse.json(await saveConnection(connection), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
