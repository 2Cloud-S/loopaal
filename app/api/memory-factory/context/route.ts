import { NextResponse } from "next/server";
import { listDriveContextSnapshots, saveDriveContextSnapshot } from "../../../../src/lib/memory-factory.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await listDriveContextSnapshots(await workspaceFromRequest(request)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Memory Factory context listing failed" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => ({}));
    return NextResponse.json(await saveDriveContextSnapshot(await workspaceFromRequest(request), String(data.name || "workspace-context")), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Memory Factory context save failed" }, { status: 400 });
  }
}
