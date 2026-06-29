import { NextResponse } from "next/server";
import { runCampaign } from "../../../../../src/lib/orchestrator.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await runCampaign(id, await workspaceFromRequest(request)));
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 401;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status });
  }
}
