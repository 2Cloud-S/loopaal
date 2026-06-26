"use client";

import { useEffect, useState } from "react";
import type { AppState } from "../../src/types.ts";

function getWorkspaceId() {
  const key = "loopaal.workspaceId";
  const current = window.localStorage.getItem(key);
  if (current) return current;
  const next = `ws_${crypto.randomUUID().slice(0, 12)}`;
  window.localStorage.setItem(key, next);
  return next;
}

export function SetupClient() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [state, setState] = useState<AppState | undefined>();

  useEffect(() => {
    const id = getWorkspaceId();
    setWorkspaceId(id);
    fetch("/api/state", { headers: { "x-loopaal-workspace": id } })
      .then(response => response.json())
      .then(setState)
      .catch(() => undefined);
  }, []);

  const googleHref = workspaceId ? `/api/connections/google/start?workspaceId=${encodeURIComponent(workspaceId)}` : "#";
  const googleConnected = Boolean(state?.connections.some(connection => connection.provider === "google" && connection.status === "connected"));

  return (
    <section className="connection-center" aria-label="Connect channels">
      <div className="section-head landing-head">
        <div>
          <h2>Connect channels without touching code.</h2>
          <p>Consumers should not edit environment files. They connect accounts from the workspace, then Loopaal uses those owned channels only for that workspace.</p>
        </div>
      </div>

      <div className="connection-grid">
        <article className="setup-card">
          <span>google</span>
          <h3>Gmail + Drive</h3>
          <p>Connect a dedicated business Google account. Gmail is send-only; Drive/Sheets can store context and campaign data.</p>
          <div className="setup-pills"><span className={googleConnected ? "status-pill ready" : "status-pill"}>{googleConnected ? "connected" : "not connected"} · workspace {workspaceId ? workspaceId.slice(-4) : "new"}</span></div>
          <a className="btn primary" aria-disabled={!workspaceId} href={googleHref}>{googleConnected ? "Reconnect Google" : "Connect Google"}</a>
        </article>
        <article className="setup-card">
          <span>whatsapp</span>
          <h3>WhatsApp Business</h3>
          <p>Use a WhatsApp Business Cloud API number owned by the customer workspace. Tokens should never be shared across customers.</p>
          <button className="btn" disabled>Guided setup next</button>
        </article>
        <article className="setup-card">
          <span>website</span>
          <h3>Website updates</h3>
          <p>Connect a signed webhook from the customer's website so Loopaal can propose updates and wait for approval before publishing.</p>
          <button className="btn" disabled>Webhook setup next</button>
        </article>
      </div>
    </section>
  );
}
