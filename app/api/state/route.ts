import { NextResponse } from "next/server";
import { integrationStatus } from "../../../src/lib/config.ts";
import { loadState } from "../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return NextResponse.json({ ...(await loadState(await workspaceFromRequest(request))), integrations: integrationStatus() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
