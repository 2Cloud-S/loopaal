import { NextResponse } from "next/server";
import { createCampaign } from "../../../src/lib/orchestrator.ts";
import { workspaceFromRequest } from "../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const data = await request.json();
  return NextResponse.json(await createCampaign(String(data.name || "Untitled campaign"), data, workspaceFromRequest(request)), { status: 201 });
}
