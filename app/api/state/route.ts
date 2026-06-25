import { NextResponse } from "next/server";
import { integrationStatus } from "../../../src/lib/config.ts";
import { loadState } from "../../../src/lib/repository.ts";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ...(await loadState()), integrations: integrationStatus() });
}
