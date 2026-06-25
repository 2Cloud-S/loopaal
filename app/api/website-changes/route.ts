import { NextResponse } from "next/server";
import { requestWebsiteChange } from "../../../src/lib/orchestrator.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return NextResponse.json(await requestWebsiteChange(await request.json()), { status: 201 });
}
