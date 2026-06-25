import { NextResponse } from "next/server";
import { rejectAction } from "../../../../../src/lib/orchestrator.ts";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(await rejectAction(id));
}
