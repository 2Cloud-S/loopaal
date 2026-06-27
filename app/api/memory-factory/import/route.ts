import { NextResponse } from "next/server";
import { importMemoryFactory } from "../../../../src/lib/memory-factory.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await importMemoryFactory(await workspaceFromRequest(request)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Memory Factory import failed" }, { status: 400 });
  }
}
