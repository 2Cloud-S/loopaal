import { NextResponse } from "next/server";
import { approveAction } from "../../../../../src/lib/orchestrator.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const data = await request.json().catch(() => ({}));
    const { id } = await context.params;
    return NextResponse.json(await approveAction(id, data.scheduledFor ? String(data.scheduledFor) : undefined, await workspaceFromRequest(request)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
