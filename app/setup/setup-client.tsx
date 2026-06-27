"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AppState } from "../../src/types.ts";

function getWorkspaceId() {
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

export function SetupClient() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [state, setState] = useState<AppState | undefined>();
  const [message, setMessage] = useState("");

  async function refresh(id = workspaceId || getWorkspaceId()) {
    setWorkspaceId(id);
    setState(await api("/api/state", id));
  }

  useEffect(() => {
    refresh(getWorkspaceId()).catch(error => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);

  async function saveIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/workspace/identity", workspaceId, { method: "POST", body: JSON.stringify(data) });
      setMessage("Business identity saved. Campaigns will now draft as this workspace, not as Loopaal.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveManualConnection(event: FormEvent<HTMLFormElement>, provider: "whatsapp" | "website") {
    event.preventDefault();
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/connections/manual", workspaceId, { method: "POST", body: JSON.stringify({ ...data, provider }) });
      event.currentTarget.reset();
      setMessage(`${provider === "whatsapp" ? "WhatsApp" : "Website"} connection saved for this workspace.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function enableMemoryFactory() {
    setMessage("");
    try {
      await api("/api/memory-factory/setup", workspaceId, { method: "POST", body: JSON.stringify({}) });
      setMessage("Memory Factory enabled. Your Drive folder and editable Sheet are ready.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function previewConnection(provider: "google" | "whatsapp" | "website") {
    if (provider === "google") {
      const sender = google?.identity?.displayName || state?.identity?.senderName || state?.identity?.businessName || google?.label || "your business";
      const email = google?.identity?.sendAsEmail || google?.identity?.email || google?.label || "connected Gmail";
      setMessage(`Gmail preview: clients will see ${sender} <${email}>.`);
      return;
    }
    if (provider === "whatsapp") {
      setMessage(`WhatsApp preview: clients will see ${whatsapp?.identity?.businessName || whatsapp?.identity?.displayName || state?.identity?.businessName || "your WhatsApp Business"} from ${whatsapp?.identity?.phoneNumber || whatsapp?.label || "the connected number"}.`);
      return;
    }
    setMessage(`Website preview: approved updates will be attributed to ${website?.identity?.businessName || state?.identity?.businessName || "this workspace"} on ${website?.identity?.domain || website?.label || "the connected endpoint"}.`);
  }

  const googleHref = "/api/connections/google/start";
  const google = state?.connections.find(connection => connection.provider === "google" && connection.status === "connected");
  const whatsapp = state?.connections.find(connection => connection.provider === "whatsapp" && connection.status === "connected");
  const website = state?.connections.find(connection => connection.provider === "website" && connection.status === "connected");
  const memoryFactoryEnabled = Boolean(google?.identity?.memoryFactoryEnabled && google.identity.driveFolderId && google.identity.spreadsheetId);

  return (
    <section className="connection-center" aria-label="Connect channels">
      <div className="section-head landing-head">
        <div>
          <h2>Connect channels without touching code.</h2>
          <p>Each customer connects their own business identity and business-owned channels. Client-facing actions use those identities, not Loopaal as the sender.</p>
        </div>
      </div>

      <div className="connection-grid">
        <form className="setup-card setup-form setup-card-wide" onSubmit={saveIdentity}>
          <span>business identity</span>
          <h3>How clients should see this workspace</h3>
          <p>This identity is used by writer co-workers, Gmail drafts, WhatsApp previews, website update attribution, and Drive/Sheets context labels.</p>
          <div className="setup-pills"><span className={state?.identity?.businessName ? "status-pill ready" : "status-pill"}>{state?.identity?.businessName ? `ready · ${state.identity.businessName}` : "required before live external drafts"}</span></div>
          <label>Business name<input name="businessName" defaultValue={state?.identity?.businessName || ""} placeholder="Your Business Studio" required /></label>
          <label>Public sender name<input name="senderName" defaultValue={state?.identity?.senderName || ""} placeholder="Your Name from Your Business" /></label>
          <label>Reply-to email<input name="replyTo" type="email" defaultValue={state?.identity?.replyTo || ""} placeholder="hello@company.com" /></label>
          <label>Website URL<input name="websiteUrl" type="url" defaultValue={state?.identity?.websiteUrl || ""} placeholder="https://company.com" /></label>
          <label>Brand tone<input name="defaultTone" defaultValue={state?.identity?.defaultTone || ""} placeholder="Warm, concise, expert, low-pressure" /></label>
          <label>Default signature/footer<textarea name="defaultSignature" defaultValue={state?.identity?.defaultSignature || ""} placeholder={"Best,\nYour Name"} /></label>
          <button className="btn primary">Save business identity</button>
        </form>

        <article className="setup-card">
          <span>google</span>
          <h3>Gmail + Drive</h3>
          <p>Connect a dedicated business Google account. Loopaal uses Gmail compose access to create drafts, not silently send from your inbox.</p>
          <div className="setup-pills"><span className={google ? "status-pill ready" : "status-pill"}>{google ? `connected · ${google.identity?.sendAsEmail || google.identity?.email || google.label}` : "not connected"}</span></div>
          {google ? <p className="setup-note-small">Client will see: {google.identity?.displayName || state?.identity?.senderName || state?.identity?.businessName || google.label} &lt;{google.identity?.sendAsEmail || google.identity?.email || google.label}&gt;{google.identity?.signature ? " · Gmail signature detected" : ""}</p> : null}
          <a className="btn primary" href={googleHref}>{google ? "Reconnect Google" : "Connect Google"}</a>
          <button className="btn" type="button" onClick={() => previewConnection("google")} disabled={!google}>Test draft preview</button>
        </article>

        <article className="setup-card">
          <span>memory factory</span>
          <h3>Drive + Sheets memory workspace</h3>
          <p>DynamoDB stays the source of truth. Memory Factory unlocks customer-owned context editing, export, and re-import in Drive/Sheets.</p>
          <div className="setup-pills"><span className={memoryFactoryEnabled ? "status-pill ready" : "status-pill"}>{memoryFactoryEnabled ? "enabled" : google ? "google connected · not enabled" : "connect google first"}</span></div>
          {google?.identity?.lastMemorySyncError ? <p className="warning-text">Last sync issue: {google.identity.lastMemorySyncError.slice(0, 180)}</p> : null}
          <button className="btn primary" type="button" onClick={enableMemoryFactory} disabled={!google}>{memoryFactoryEnabled ? "Repair / Re-sync setup" : "Enable Memory Factory"}</button>
          {memoryFactoryEnabled ? <div className="row-actions">
            <a className="btn" href={google?.identity?.spreadsheetUrl || "#"} target="_blank" rel="noreferrer">Open Memory Sheet</a>
            <a className="btn" href={google?.identity?.driveFolderUrl || "#"} target="_blank" rel="noreferrer">Open Drive Folder</a>
          </div> : null}
        </article>

        <form className="setup-card setup-form" onSubmit={event => saveManualConnection(event, "whatsapp")}>
          <span>whatsapp</span>
          <h3>WhatsApp Business</h3>
          <p>Use a WhatsApp Business Cloud API number owned by this customer workspace.</p>
          <div className="setup-pills"><span className={whatsapp ? "status-pill ready" : "status-pill"}>{whatsapp ? `connected · ${whatsapp.identity?.businessName || whatsapp.identity?.phoneNumber || whatsapp.label}` : "not connected"}</span></div>
          <label>Public business name<input name="businessName" defaultValue={state?.identity?.businessName || ""} placeholder="Company shown to clients" required /></label>
          <label>Business phone number<input name="phoneNumber" placeholder="+923001234567" /></label>
          <label>Phone number ID<input name="phoneNumberId" placeholder="1234567890" required /></label>
          <label>Access token<input name="accessToken" type="password" placeholder="Meta access token" required /></label>
          <label>Verify token<input name="verifyToken" type="password" placeholder="Webhook verify token" /></label>
          <button className="btn">Save WhatsApp</button>
          <button className="btn" type="button" onClick={() => previewConnection("whatsapp")} disabled={!whatsapp}>Preview message identity</button>
        </form>

        <form className="setup-card setup-form" onSubmit={event => saveManualConnection(event, "website")}>
          <span>website</span>
          <h3>Website updates</h3>
          <p>Connect a signed webhook/API endpoint so Loopaal can propose changes and wait for approval before publishing.</p>
          <div className="setup-pills"><span className={website ? "status-pill ready" : "status-pill"}>{website ? `connected · ${website.identity?.domain || website.label}` : "not connected"}</span></div>
          <label>Site/business name<input name="businessName" defaultValue={state?.identity?.businessName || ""} placeholder="Company site name" required /></label>
          <label>Domain<input name="domain" placeholder="company.com" /></label>
          <label>Webhook URL<input name="webhookUrl" type="url" placeholder="https://example.com/api/loopaal" required /></label>
          <label>Webhook secret<input name="webhookSecret" type="password" placeholder="Shared signing secret" required /></label>
          <button className="btn">Save website</button>
          <button className="btn" type="button" onClick={() => previewConnection("website")} disabled={!website}>Preview update identity</button>
        </form>
      </div>
      {message ? <p className="form-status">{message}</p> : null}
    </section>
  );
}
