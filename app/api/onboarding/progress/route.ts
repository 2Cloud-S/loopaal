import { NextResponse } from "next/server";
import { loadState, saveOnboardingState } from "../../../../src/lib/repository.ts";
import { normalizeStepIds, onboardingView } from "../../../../src/lib/onboarding.ts";
import { workspaceFromRequest } from "../../../../src/lib/workspace.ts";
import type { OnboardingStatus } from "../../../../src/types.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const workspaceId = await workspaceFromRequest(request);
    const data = await request.json().catch(() => ({}));
    const requestedStatus = data?.status === "active" || data?.status === "not_started" ? data.status as OnboardingStatus : "active";
    await saveOnboardingState(workspaceId, {
      status: requestedStatus,
      completedStepIds: normalizeStepIds(data?.stepIds || data?.stepId)
    });
    const state = await loadState(workspaceId);
    return NextResponse.json(onboardingView(state, workspaceId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication required" }, { status: 400 });
  }
}
