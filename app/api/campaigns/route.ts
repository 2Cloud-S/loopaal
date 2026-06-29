import { NextResponse } from "next/server";
import { createCampaign } from "../../../src/lib/orchestrator.ts";
import { workspaceFromRequest } from "../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    return NextResponse.json(await createCampaign(String(data.name || "Untitled campaign"), data, await workspaceFromRequest(request)), { status: 201 });
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 401;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status });
  }
}
