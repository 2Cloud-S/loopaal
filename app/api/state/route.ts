import { NextResponse } from "next/server";
import { integrationStatus } from "../../../src/lib/config.ts";
import { aiTrialStatus } from "../../../src/lib/ai-security.ts";
import { onboardingView } from "../../../src/lib/onboarding.ts";
import { loadState } from "../../../src/lib/repository.ts";
import { workspaceFromRequest } from "../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    const state = await loadState(workspaceId);
    return NextResponse.json({ ...state, onboarding: onboardingView(state, workspaceId), integrations: integrationStatus(), ai: aiTrialStatus(state) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 401 });
  }
}
