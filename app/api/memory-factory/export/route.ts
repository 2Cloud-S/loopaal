import { NextResponse } from "next/server";
import { exportMemoryFactory } from "../../../../src/lib/memory-factory.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => ({}));
    return NextResponse.json(await exportMemoryFactory(await workspaceFromRequest(request), data.campaignId ? String(data.campaignId) : undefined));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Memory Factory export failed" }, { status: 400 });
  }
}
