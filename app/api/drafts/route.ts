import { NextResponse } from "next/server";
import { draftOutreach } from "../../../src/lib/orchestrator.ts";
import { workspaceFromRequest } from "../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    return NextResponse.json(await draftOutreach(String(data.prospectId), data.channel === "whatsapp" ? "whatsapp" : "gmail", await workspaceFromRequest(request)), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
