import { NextResponse } from "next/server";
import { remember } from "../../../src/lib/repository.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const data = await request.json();
  return NextResponse.json(await remember(data.scope || "business", String(data.scopeId || "default"), String(data.text || ""), Array.isArray(data.tags) ? data.tags.map(String) : []), { status: 201 });
}
