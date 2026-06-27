import { NextResponse } from "next/server";
import { requestWebsiteChange } from "../../../src/lib/orchestrator.ts";
import { workspaceFromRequest } from "../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await requestWebsiteChange(await request.json(), await workspaceFromRequest(request)), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
