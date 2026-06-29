import { NextResponse } from "next/server";
import { loadState, saveOnboardingState } from "../../../../src/lib/repository.ts";
import { onboardingSteps, onboardingView } from "../../../../src/lib/onboarding.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    await saveOnboardingState(workspaceId, { status: "completed", completedStepIds: [...onboardingSteps] });
    const state = await loadState(workspaceId);
    return NextResponse.json(onboardingView(state, workspaceId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 400 });
  }
}
