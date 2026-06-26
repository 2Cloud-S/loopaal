import { NextResponse } from "next/server";
import { integrationStatus } from "../../../src/lib/config.ts";
import { loadState } from "../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json({ ...(await loadState(workspaceFromRequest(request))), integrations: integrationStatus() });
}
