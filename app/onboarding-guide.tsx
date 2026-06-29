"use client";

import { useEffect, useMemo, useState } from "react";

type OnboardingStatus = "not_started" | "active" | "completed" | "dismissed";

type OnboardingView = {
  workspaceId: string;
  status: OnboardingStatus;
  completedStepIds: string[];
  autoCompletedStepIds: string[];
  totalSteps: number;
};

const steps = [
  {
    id: "intro",
    title: "What Loopaal does",
    body: "Loopaal coordinates small co-workers for research, writing, memory, approvals, replies, and customer-owned channel actions."
  },
  {
    id: "identity",
    title: "Create business identity",
    body: "Set the business name, sender, tone, website, and signature so drafts feel like the customer workspace."
  },
  {
    id: "ai-trial",
    title: "Understand AI trial",
    body: "Loopaal AI can run the first 5 campaigns. After that, customers connect AI through OAuth or a secure vault flow."
  },
  {
    id: "google",
    title: "Connect Google",
    body: "Google unlocks Gmail drafts and Drive/Sheets Memory Factory for editable customer-owned context."
  },
  {
    id: "optional-channels",
    title: "Connect optional channels",
    body: "WhatsApp and website webhooks are optional live channels. They stay approval-gated and customer-owned."
  },
  {
    id: "campaign",
    title: "Run first campaign",
    body: "Enter volatile criteria, launch co-workers, and let them produce prospects, worker reports, and memory."
  },
  {
    id: "review-outputs",
    title: "Review outputs",
    body: "Inspect prospects, approvals, memory, and audit logs before letting anything leave the workspace."
  },
  {
    id: "approve-safely",
    title: "Approve safely",
    body: "Real sends and updates require explicit approval and live-mode readiness. Preview stays safe by default."
  }
] as const;

function getWorkspaceId() {
  const key = "loopaal.workspaceId";
  const current = window.localStorage.getItem(key);
  if (current) return current;
  const next = `ws_${crypto.randomUUID().slice(0, 12)}`;
  window.localStorage.setItem(key, next);
  return next;
}

async function onboardingApi(path: string, workspaceId: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-loopaal-workspace": workspaceId,
      ...(init?.headers || {})
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<OnboardingView>;
}

export function OnboardingGuide({ surface }: { surface: "setup" | "dashboard" }) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [guide, setGuide] = useState<OnboardingView | null>(null);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const completed = useMemo(() => new Set(guide?.completedStepIds || []), [guide]);
  const doneCount = completed.size;
  const progress = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find(step => !completed.has(step.id)) || steps[steps.length - 1];

  async function refresh(id = workspaceId || getWorkspaceId(), shouldAutoOpen = false) {
    setWorkspaceId(id);
    const next = await onboardingApi("/api/onboarding/status", id);
    setGuide(next);
    if (shouldAutoOpen && (next.status === "not_started" || next.status === "active")) {
      setOpen(true);
      if (next.status === "not_started") {
        onboardingApi("/api/onboarding/progress", id, { method: "POST", body: JSON.stringify({ status: "active" }) }).catch(() => undefined);
      }
    }
  }

  async function post(path: string, body: Record<string, unknown> = {}) {
    setBusy(path);
    setError("");
    try {
      const next = await onboardingApi(path, workspaceId || getWorkspaceId(), { method: "POST", body: JSON.stringify(body) });
      setGuide(next);
      return next;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    refresh(getWorkspaceId(), true).catch(error => setError(error instanceof Error ? error.message : String(error)));
  }, []);

  useEffect(() => {
    if (!open || minimized) return undefined;
    const id = window.setInterval(() => refresh().catch(() => undefined), 5000);
    return () => window.clearInterval(id);
  }, [open, minimized, workspaceId]);

  if (!guide) return null;

  if (!open) {
    return (
      <button className="onboarding-launcher" type="button" onClick={() => { setOpen(true); setMinimized(false); post("/api/onboarding/progress"); }}>
        <span>Guide</span>
        <b>{doneCount}/{steps.length}</b>
      </button>
    );
  }

  return (
    <aside className={minimized ? "onboarding-panel minimized" : "onboarding-panel"} aria-label="Loopaal onboarding tutorial">
      <header>
        <div>
          <p className="kicker">new user tutorial</p>
          <h2>Set up Loopaal without guessing.</h2>
        </div>
        <div className="onboarding-controls">
          <button type="button" onClick={() => setMinimized(value => !value)}>{minimized ? "Open" : "Minimize"}</button>
          <button type="button" onClick={() => post("/api/onboarding/dismiss").then(() => setOpen(false))}>Dismiss</button>
        </div>
      </header>

      {!minimized ? (
        <>
          <div className="onboarding-progress" aria-label={`${doneCount} of ${steps.length} onboarding steps completed`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="onboarding-nudge">
            {doneCount === steps.length ? "You have touched every core step. You can complete the tutorial now." : surface === "setup" ? `Next: ${nextStep.title}.` : "Use this guide while you run the first real workflow."}
          </p>
          <ol className="onboarding-steps">
            {steps.map((step, index) => {
              const isDone = completed.has(step.id);
              const isAuto = guide.autoCompletedStepIds.includes(step.id);
              return (
                <li className={isDone ? "done" : ""} key={step.id}>
                  <div className="onboarding-step-index">{String(index + 1).padStart(2, "0")}</div>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                    <div className="onboarding-step-actions">
                      <span>{isDone ? isAuto ? "Auto-completed from workspace state" : "Completed" : "Recommended"}</span>
                      {!isDone ? <button type="button" disabled={Boolean(busy)} onClick={() => post("/api/onboarding/progress", { stepId: step.id })}>Mark done</button> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {error ? <p className="onboarding-error">{error}</p> : null}
          <footer className="onboarding-footer">
            <button className="btn" type="button" onClick={() => refresh().catch(error => setError(error instanceof Error ? error.message : String(error)))}>Refresh guide</button>
            <button className="btn primary" type="button" disabled={Boolean(busy)} onClick={() => post("/api/onboarding/complete").then(() => setOpen(false))}>Complete tutorial</button>
          </footer>
        </>
      ) : (
        <button className="onboarding-mini" type="button" onClick={() => setMinimized(false)}>
          Next: {nextStep.title} · {doneCount}/{steps.length}
        </button>
      )}
    </aside>
  );
}
