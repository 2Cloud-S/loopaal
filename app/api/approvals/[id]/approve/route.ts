import { NextResponse } from "next/server";
import { approveAction } from "../../../../../src/lib/orchestrator.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const data = await request.json().catch(() => ({}));
  const { id } = await context.params;
  return NextResponse.json(await approveAction(id, data.scheduledFor ? String(data.scheduledFor) : undefined, workspaceFromRequest(request)));
}
