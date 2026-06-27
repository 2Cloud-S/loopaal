import { NextResponse } from "next/server";
import { getMemoryFactoryStatus } from "../../../../src/lib/memory-factory.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getMemoryFactoryStatus(await workspaceFromRequest(request)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
