"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppState, Campaign, Prospect } from "../src/types.ts";
import { createLoopaalSupabaseBrowserClient } from "../src/lib/supabase-browser.ts";

type State = AppState & { integrations?: Record<string, unknown> };

const emptyState: State = { campaigns: [], prospects: [], memories: [], approvals: [], workerJobs: [], audit: [], connections: [] };

function getWorkspaceId() {
  if (typeof window === "undefined") return "server";
  const key = "loopaal.workspaceId";
  const current = window.localStorage.getItem(key);
  if (current) return current;
  const next = `ws_${crypto.randomUUID().slice(0, 12)}`;
  window.localStorage.setItem(key, next);
  return next;
}

async function api(path: string, workspaceId: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", "x-loopaal-workspace": workspaceId, ...(init?.headers || {}) } });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export function LoopaalConsole() {
  const router = useRouter();
  const [state, setState] = useState<State>(emptyState);
  const [workspaceId, setWorkspaceId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");

  async function refresh(id = workspaceId || getWorkspaceId()) {
    setWorkspaceId(id);
    setState(await api("/api/state", id));
  }

  useEffect(() => { refresh(getWorkspaceId()).catch(error => setError(String(error))); }, []);
  useEffect(() => {
    const supabase = createLoopaalSupabaseBrowserClient();
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email || "")).catch(() => undefined);
  }, []);

  async function signOut() {
    const supabase = createLoopaalSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const identityReady = Boolean(state.identity?.businessName);
  const metrics = useMemo(() => [
    ["Campaigns", state.campaigns.length],
    ["Prospects", state.prospects.length],
    ["Workers", state.workerJobs.length],
    ["Approvals", state.approvals.filter(x => x.status === "pending").length]
  ], [state]);

  async function submitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy("Creating campaign");
    setError("");
    setNotice("");
    try {
      const campaign = await api("/api/campaigns", workspaceId, { method: "POST", body: JSON.stringify(data) }) as Campaign;
      form.reset();
      await api(`/api/campaigns/${campaign.id}/run`, workspaceId, { method: "POST" });
      await refresh();
      setNotice("Campaign launched. Co-workers completed and records were saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  async function draft(prospect: Prospect, channel: "gmail" | "whatsapp") {
    setBusy(`Drafting ${channel}`);
    setError("");
    setNotice("");
    try {
      const approval = await api("/api/drafts", workspaceId, { method: "POST", body: JSON.stringify({ prospectId: prospect.id, channel }) });
      await refresh();
      if (approval.status === "draft_created") setNotice("Gmail draft created in the connected mailbox.");
      else if (approval.payload?.recipientMissing) setNotice("Internal draft saved. Add a recipient before creating an external draft.");
      else if (approval.status === "failed") setNotice("Draft saved, but Gmail draft creation failed. Check the approval details.");
      else setNotice(`${channel === "gmail" ? "Email" : "WhatsApp"} draft saved for approval.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  async function saveRecipient(event: FormEvent<HTMLFormElement>, prospect: Prospect) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy("Saving recipient");
    setError("");
    setNotice("");
    try {
      await api(`/api/prospects/${prospect.id}/contact`, workspaceId, { method: "POST", body: JSON.stringify(data) });
      await refresh();
      setNotice("Prospect recipient saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  async function approval(id: string, action: "approve" | "reject") {
    setBusy(action === "approve" ? "Approving action" : "Rejecting action");
    setError("");
    setNotice("");
    try {
      await api(`/api/approvals/${id}/${action}`, workspaceId, { method: "POST", body: JSON.stringify({}) });
      await refresh();
      setNotice(action === "approve" ? "Approval processed." : "Draft rejected.");
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <nav className="nav" aria-label="Loopaal">
        <a className="wordmark" href="/">loopaal</a>
        <div className="search-pill" aria-label="Command hint"><span>Campaign · workers · approvals</span><kbd>{workspaceId ? workspaceId.slice(-4) : "safe"}</kbd></div>
        <div className="nav-status"><span className={state.integrations?.outboundLive ? "signal live" : "signal"} /><span>{state.integrations?.outboundLive ? "Live actions" : "Preview actions"}</span>{email ? <button className="link-button" onClick={signOut}>Sign out</button> : null}</div>
      </nav>
      {(notice || error) ? <div className={error ? "toast toast-error" : "toast"} role="status">{error || notice}</div> : null}
      <main>
        <section className="intro">
          <div>
            <p className="kicker">operator console</p>
            <h1>Revenue co-workers, supervised.</h1>
          </div>
          <div className="intro-copy">
            <p>{email ? `Signed in as ${email}. ` : ""}Loopaal runs a small agentic system for prospect research, outreach writing, memory, approvals, and auditability. Campaigns can run in preview; real sends require customer-owned channels.</p>
            <a className="btn primary" href="#campaign">Create campaign</a>
          </div>
        </section>

        <section className="workbench">
          <section className="workspace-banner" aria-label="Workspace readiness">
            <div>
              <p className="kicker">workspace readiness</p>
              <h2>{identityReady ? `Client-facing as ${state.identity?.businessName}.` : "Add Business Identity before external drafts."}</h2>
              <p>{identityReady ? `${state.integrations?.outboundLive ? "Live outbound is enabled" : "Preview mode is enabled"}, and drafts use this workspace identity rather than Loopaal as the sender.` : "Campaigns and internal drafts can still run, but Gmail drafts, WhatsApp messages, and website updates need the consumer's business identity first."}</p>
            </div>
            <a className="btn" href="/setup">Setup workspace</a>
          </section>

          <header className="section-head">
            <div>
              <h2>Workflow console</h2>
              <p>Create one campaign and watch the co-workers report back. New workspaces start empty; the rows below are live records from your workspace, not static samples.</p>
            </div>
            <button className="btn" onClick={() => refresh().then(() => setNotice("Workspace refreshed.")).catch(error => setError(error instanceof Error ? error.message : String(error)))} disabled={Boolean(busy)}>Refresh</button>
          </header>

          <div className="metrics" aria-label="Project metrics">
            {metrics.map(([label, value]) => <div className="metric" key={label}><b>{value}</b><span>{label}</span></div>)}
          </div>

          <div className="bench-grid">
            <form className="panel campaign-panel" id="campaign" onSubmit={submitCampaign}>
              <header><h3>New campaign</h3><span>{busy || "ready"}</span></header>
              <label>Campaign name<input name="name" required placeholder="Pakistan architecture studios" /></label>
              <label>Business names<textarea name="businessNames" required placeholder={"North Studio\nSouth Works"} /></label>
              <div className="form-grid">
                <label>Industries<input name="industries" placeholder="Architecture, design" /></label>
                <label>Countries<input name="countries" placeholder="Pakistan, UAE" /></label>
              </div>
              <label>Decision makers<input name="decisionMakers" placeholder="Founder, Managing Director" /></label>
              <label>Offer<textarea name="offer" placeholder="We help small teams automate outreach with approval-safe AI." /></label>
              <label>Notes<textarea name="notes" placeholder="Tone should adapt to each business." /></label>
              <button className="btn primary" disabled={Boolean(busy)}>Launch co-workers</button>
              {error ? <p className="form-status">{error}</p> : <p className="form-status" />}
            </form>

            <section className="panel panel-dark">
              <header><h3>Co-workers</h3><span>parallel jobs</span></header>
              <div className="rows">
                {state.workerJobs.length ? state.workerJobs.slice(0, 8).map(job => (
                  <article className="row row-dark" key={job.id}>
                    <div className="row-line"><b>{job.workerId}</b><span className="status">{job.status}</span></div>
                    <small>{job.summary}</small>
                  </article>
                )) : <p className="empty">No worker jobs yet.</p>}
              </div>
            </section>

            <section className="panel panel-wide">
              <header><h3>Prospects</h3><span>draft buttons appear after research</span></header>
              <div className="rows">
                {state.prospects.length ? state.prospects.map(prospect => (
                  <article className="row" key={prospect.id}>
                    <div className="row-line"><b>{prospect.businessName}</b><span className="status">{Math.round(prospect.confidence * 100)}%</span></div>
                    <small>{prospect.industry || "Industry unknown"} · {prospect.country || "Country unknown"} · {prospect.contactRole || "Decision maker"}</small>
                    <form className="recipient-form" onSubmit={event => saveRecipient(event, prospect)}>
                      <label>Recipient email<input name="email" type="email" defaultValue={prospect.email || ""} placeholder="client@company.com" /></label>
                      <label>WhatsApp phone<input name="phone" defaultValue={prospect.phone || ""} placeholder="+923001234567" /></label>
                      <button className="btn" disabled={Boolean(busy)}>Save recipient</button>
                    </form>
                    <div className="row-actions">
                      <button className="btn" onClick={() => draft(prospect, "gmail")} disabled={Boolean(busy)}>Draft email</button>
                      <button className="btn" onClick={() => draft(prospect, "whatsapp")} disabled={Boolean(busy)}>Draft WhatsApp</button>
                    </div>
                  </article>
                )) : <p className="empty">Run a campaign to generate real prospect records for this workspace. Nothing here is pre-filled sample data.</p>}
              </div>
            </section>

            <section className="panel">
              <header><h3>Approvals</h3><span>drafts you create</span></header>
              <div className="rows">
                {state.approvals.length ? state.approvals.slice(0, 8).map(item => (
                  <article className="row" key={item.id}>
                    <div className="row-line"><b>{item.title}</b><span className="status">{item.status}</span></div>
                    <small>{String(item.payload.subject || item.payload.body || "Website change request").slice(0, 110)}</small>
                    {item.payload.setupRequired ? <small className="warning-text">{String(item.payload.setupRequired)}</small> : null}
                    {item.payload.senderName ? <small>Client-facing sender: {String(item.payload.senderName)}{item.payload.businessName ? ` · ${String(item.payload.businessName)}` : ""}</small> : null}
                    {item.payload.recipientMissing ? <small className="warning-text">Recipient missing — add a verified email/phone before any external action.</small> : null}
                    {item.payload.gmailDraftId ? <a className="small-link" href={String(item.payload.gmailDraftUrl || "https://mail.google.com/mail/u/0/#drafts")} target="_blank" rel="noreferrer">Open Gmail drafts</a> : null}
                    {item.payload.gmailDraftError ? <small className="warning-text">Gmail draft failed: {String(item.payload.gmailDraftError).slice(0, 160)}</small> : null}
                    {item.status === "pending" ? <div className="row-actions"><button className="btn primary" onClick={() => approval(item.id, "approve")}>Approve</button><button className="btn" onClick={() => approval(item.id, "reject")}>Reject</button></div> : null}
                  </article>
                )) : <p className="empty">No drafts yet. After prospects appear, click “Draft email” or “Draft WhatsApp” to create approval items here.</p>}
              </div>
            </section>

            <section className="panel">
              <header><h3>Memory</h3><span>saved context</span></header>
              <div className="rows">
                {state.memories.length ? state.memories.slice(0, 6).map(memory => <article className="row" key={memory.id}><b>{memory.scope}</b><small>{memory.text}</small></article>) : <p className="empty">Memory appears after a worker run or inbound reply.</p>}
              </div>
            </section>

            <section className="panel">
              <header><h3>Audit trail</h3><span>trust layer</span></header>
              <div className="rows">
                {state.audit.length ? state.audit.slice(0, 8).map(event => <article className="row" key={event.id}><div className="row-line"><b>{event.action}</b><span className="status">{event.actor}</span></div><small>{event.detail}</small></article>) : <p className="empty">No audit events yet.</p>}
              </div>
            </section>
          </div>
        </section>
      </main>
      <footer><span>loopaal console</span><span>approval-first automation</span></footer>
    </>
  );
}
