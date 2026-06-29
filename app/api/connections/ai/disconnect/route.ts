import { NextResponse } from "next/server";
import { disconnectConnection } from "../../../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    await disconnectConnection(workspaceId, "ai");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 400 });
  }
}
