import { NextResponse } from "next/server";
import { ingestReply } from "../../../../src/lib/orchestrator.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await ingestReply("whatsapp", await request.json());
  return NextResponse.json({ received: true });
}
