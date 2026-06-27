import { NextResponse } from "next/server";
import { updateProspectContact } from "../../../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

function cleanEmail(value: unknown) {
  const email = String(value || "").trim();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid recipient email address.");
  return email;
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/[^\d+]/g, "").slice(0, 32);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    return NextResponse.json(await updateProspectContact(id, { email: cleanEmail(data.email), phone: cleanPhone(data.phone) }, await workspaceFromRequest(request)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update prospect contact" }, { status: error instanceof Error && error.message.includes("valid") ? 400 : 401 });
  }
}
