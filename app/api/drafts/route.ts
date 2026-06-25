import { NextResponse } from "next/server";
import { draftOutreach } from "../../../src/lib/orchestrator.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const data = await request.json();
  return NextResponse.json(await draftOutreach(String(data.prospectId), data.channel === "whatsapp" ? "whatsapp" : "gmail"), { status: 201 });
}
