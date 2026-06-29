import { NextResponse } from "next/server";
import { signedAiState } from "../../../../../src/lib/ai-security.ts";
import { workspaceFromRequest } from "../../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    const data = await request.json().catch(() => ({}));
    const provider = String(data.provider || "gemini").toLowerCase();
    if (provider !== "gemini" && provider !== "openai") {
      return NextResponse.json({ error: "Unsupported AI provider" }, { status: 400 });
    }
    return NextResponse.json({
      status: "oauth_required",
      provider,
      state: signedAiState(workspaceId, provider),
      message: "Customer AI connections require provider OAuth or a server-side secure vault. Raw API keys are not accepted in Loopaal v1."
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
