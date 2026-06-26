import { NextResponse } from "next/server";
import { runCampaign } from "../../../../../src/lib/orchestrator.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(await runCampaign(id, workspaceFromRequest(request)));
}
