import { NextResponse } from "next/server";
import { loadState, saveWorkspaceIdentity } from "../../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    const state = await loadState(workspaceId);
    return NextResponse.json(state.identity || null);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    const data = await request.json();
    return NextResponse.json(await saveWorkspaceIdentity({ ...data, workspaceId }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 400 });
  }
}
