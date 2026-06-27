import { NextResponse } from "next/server";
import { setupMemoryFactory } from "../../../../src/lib/memory-factory.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await setupMemoryFactory(await workspaceFromRequest(request)), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Memory Factory setup failed" }, { status: 400 });
  }
}
