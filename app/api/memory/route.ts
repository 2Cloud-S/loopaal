import { NextResponse } from "next/server";
import { remember } from "../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    return NextResponse.json(await remember(data.scope || "business", String(data.scopeId || "default"), String(data.text || ""), Array.isArray(data.tags) ? data.tags.map(String) : [], await workspaceFromRequest(request)), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
