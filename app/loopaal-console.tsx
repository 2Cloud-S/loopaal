"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AppState, Campaign, Prospect } from "../src/types.ts";

type State = AppState & { integrations?: Record<string, unknown> };

const emptyState: State = { campaigns: [], prospects: [], memories: [], approvals: [], workerJobs: [], audit: [] };

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export function LoopaalConsole() {
  const [state, setState] = useState<State>(emptyState);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setState(await api("/api/state"));
  }

  useEffect(() => { refresh().catch(error => setError(String(error))); }, []);

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
    try {
      const campaign = await api("/api/campaigns", { method: "POST", body: JSON.stringify(data) }) as Campaign;
      form.reset();
      await api(`/api/campaigns/${campaign.id}/run`, { method: "POST" });
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  async function draft(prospect: Prospect, channel: "gmail" | "whatsapp") {
    setBusy(`Drafting ${channel}`);
    try {
      await api("/api/drafts", { method: "POST", body: JSON.stringify({ prospectId: prospect.id, channel }) });
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  async function approval(id: string, action: "approve" | "reject") {
    setBusy(action === "approve" ? "Approving action" : "Rejecting action");
    try {
      await api(`/api/approvals/${id}/${action}`, { method: "POST", body: JSON.stringify({}) });
      await refresh();
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
        <div className="search-pill" aria-label="Command hint"><span>Campaign · workers · approvals</span><kbd>demo</kbd></div>
        <div className="nav-status"><span className={state.integrations?.dynamodb ? "signal live" : "signal"} /><span>{state.integrations?.store === "dynamodb" ? "Live store" : "Demo store"}</span></div>
      </nav>
      <main>
        <section className="intro">
          <div>
            <p className="kicker">operator console</p>
            <h1>Revenue co-workers, supervised.</h1>
          </div>
          <div className="intro-copy">
            <p>Loopaal runs a small agentic system for prospect research, outreach writing, memory, approvals, and auditability — with every external action kept behind a human gate.</p>
            <a className="btn primary" href="#campaign">Run demo flow</a>
          </div>
        </section>

        <section className="workbench">
          <header className="section-head">
            <div>
              <h2>Workflow console</h2>
              <p>Create one campaign and watch the co-workers report back.</p>
            </div>
            <button className="btn" onClick={refresh} disabled={Boolean(busy)}>Refresh</button>
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
              <header><h3>Prospects</h3><span>verified-safe records</span></header>
              <div className="rows">
                {state.prospects.length ? state.prospects.map(prospect => (
                  <article className="row" key={prospect.id}>
                    <div className="row-line"><b>{prospect.businessName}</b><span className="status">{Math.round(prospect.confidence * 100)}%</span></div>
                    <small>{prospect.industry || "Industry unknown"} · {prospect.country || "Country unknown"} · {prospect.contactRole || "Decision maker"}</small>
                    <div className="row-actions">
                      <button className="btn" onClick={() => draft(prospect, "gmail")} disabled={Boolean(busy)}>Draft email</button>
                      <button className="btn" onClick={() => draft(prospect, "whatsapp")} disabled={Boolean(busy)}>Draft WhatsApp</button>
                    </div>
                  </article>
                )) : <p className="empty">Run a campaign to generate prospects.</p>}
              </div>
            </section>

            <section className="panel">
              <header><h3>Approvals</h3><span>human gate</span></header>
              <div className="rows">
                {state.approvals.length ? state.approvals.slice(0, 8).map(item => (
                  <article className="row" key={item.id}>
                    <div className="row-line"><b>{item.title}</b><span className="status">{item.status}</span></div>
                    <small>{String(item.payload.subject || item.payload.body || "Website change request").slice(0, 110)}</small>
                    {item.status === "pending" ? <div className="row-actions"><button className="btn primary" onClick={() => approval(item.id, "approve")}>Approve</button><button className="btn" onClick={() => approval(item.id, "reject")}>Reject</button></div> : null}
                  </article>
                )) : <p className="empty">No pending approvals.</p>}
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
