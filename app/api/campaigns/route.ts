import { NextResponse } from "next/server";
import { createCampaign } from "../../../src/lib/orchestrator.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const data = await request.json();
  return NextResponse.json(await createCampaign(String(data.name || "Untitled campaign"), data), { status: 201 });
}
