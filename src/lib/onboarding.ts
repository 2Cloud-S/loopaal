import type { AppState, OnboardingState, OnboardingStatus } from "../types.ts";

export const onboardingSteps = [
  "intro",
  "identity",
  "ai-trial",
  "google",
  "optional-channels",
  "campaign",
  "review-outputs",
  "approve-safely"
] as const;

export type OnboardingStepId = (typeof onboardingSteps)[number];

export interface OnboardingView extends OnboardingState {
  autoCompletedStepIds: OnboardingStepId[];
  totalSteps: number;
}

export function deriveOnboardingStepIds(state: AppState): OnboardingStepId[] {
  const completed = new Set<OnboardingStepId>();
  const google = state.connections.find(connection => connection.provider === "google" && connection.status === "connected");
  const whatsapp = state.connections.find(connection => connection.provider === "whatsapp" && connection.status === "connected");
  const website = state.connections.find(connection => connection.provider === "website" && connection.status === "connected");

  if (state.identity?.businessName) completed.add("identity");
  if (state.campaigns.length > 0) completed.add("ai-trial");
  if (google) completed.add("google");
  if (whatsapp || website) completed.add("optional-channels");
  if (state.campaigns.length > 0) completed.add("campaign");
  if (state.prospects.length > 0 || state.memories.length > 0 || state.audit.length > 0 || state.approvals.length > 0) completed.add("review-outputs");
  if (state.approvals.some(approval => ["approved", "rejected", "previewed", "draft_created", "sent"].includes(approval.status))) completed.add("approve-safely");

  return Array.from(completed);
}

export function onboardingView(state: AppState, workspaceId: string): OnboardingView {
  const now = new Date().toISOString();
  const autoCompletedStepIds = deriveOnboardingStepIds(state);
  const saved = state.onboarding || {
    workspaceId,
    status: "not_started" as OnboardingStatus,
    completedStepIds: [],
    createdAt: now,
    updatedAt: now
  };
  return {
    ...saved,
    workspaceId,
    completedStepIds: Array.from(new Set([...saved.completedStepIds, ...autoCompletedStepIds])),
    autoCompletedStepIds,
    totalSteps: onboardingSteps.length
  };
}

export function normalizeStepIds(stepIds: unknown): OnboardingStepId[] {
  const values = Array.isArray(stepIds) ? stepIds : typeof stepIds === "string" ? [stepIds] : [];
  return values.filter((stepId): stepId is OnboardingStepId => onboardingSteps.includes(stepId as OnboardingStepId));
}
