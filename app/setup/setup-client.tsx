"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { AppState } from "../../src/types.ts";

type SetupState = AppState & { ai?: { limit: number; used: number; remaining: number; exhausted: boolean; customerAiConnected: boolean; provider?: string; model?: string; requiresCustomerAi: boolean } };

function getWorkspaceId() {
  const key = "loopaal.workspaceId";
  const current = window.localStorage.getItem(key);
  if (current) return current;
  const next = `ws_${crypto.randomUUID().slice(0, 12)}`;
  window.localStorage.setItem(key, next);
  return next;
}

async function api(path: string, workspaceId: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-loopaal-workspace": workspaceId,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export function SetupClient() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [state, setState] = useState<SetupState | undefined>();
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");
  const lastPingRef = useRef("");

  function ping(tone: "success" | "error" | "info") {
    try {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const audio = new AudioContextCtor();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tone === "error" ? 220 : tone === "success" ? 660 : 520;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, audio.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.18);
      window.setTimeout(() => audio.close().catch(() => undefined), 260);
    } catch {
      // Browsers may block audio until user interaction; visual notification still works.
    }
  }

  function notify(text: string, tone: "success" | "error" | "info" = "info") {
    setMessageTone(tone);
    setMessage(text);
    const pingKey = `${tone}:${text}`;
    if (lastPingRef.current !== pingKey) {
      lastPingRef.current = pingKey;
      ping(tone);
    }
  }

  function clearNotice() {
    setMessage("");
    setMessageTone("info");
  }

  async function refresh(id = workspaceId || getWorkspaceId()) {
    setWorkspaceId(id);
    setState(await api("/api/state", id));
  }

  useEffect(() => {
    refresh(getWorkspaceId()).catch(error => notify(error instanceof Error ? error.message : String(error), "error"));
  }, []);

  async function saveIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotice();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/workspace/identity", workspaceId, { method: "POST", body: JSON.stringify(data) });
      notify("Business identity saved. Campaign drafts will use this workspace identity.", "success");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  }

  async function saveManualConnection(event: FormEvent<HTMLFormElement>, provider: "whatsapp" | "website") {
    event.preventDefault();
    clearNotice();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api("/api/connections/manual", workspaceId, { method: "POST", body: JSON.stringify({ ...data, provider }) });
      form.reset();
      notify(`${provider === "whatsapp" ? "WhatsApp" : "Website"} connection saved for this workspace.`, "success");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  }

  async function testWebsiteConnection(form: HTMLFormElement) {
    clearNotice();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await api("/api/connections/website/test", workspaceId, { method: "POST", body: JSON.stringify(data) });
      notify(`Website webhook test reached the endpoint with status ${result.status}.`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  }

  async function enableMemoryFactory() {
    clearNotice();
    try {
      await api("/api/memory-factory/setup", workspaceId, { method: "POST", body: JSON.stringify({}) });
      notify("Memory Factory enabled. Your Drive folder and editable Sheet are ready.", "success");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  }

  async function connectAiProvider(provider: "gemini" | "openai") {
    clearNotice();
    try {
      const result = await api("/api/connections/ai/start", workspaceId, { method: "POST", body: JSON.stringify({ provider }) });
      notify(result.message || "Customer AI connection requires OAuth or secure vault setup. Raw keys are not accepted.", "info");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  }

  async function disconnectAiProvider() {
    clearNotice();
    try {
      await api("/api/connections/ai/disconnect", workspaceId, { method: "POST", body: JSON.stringify({}) });
      notify("AI provider disconnected for this workspace.", "success");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    }
  }

  function previewConnection(provider: "google" | "whatsapp" | "website") {
    if (provider === "google") {
      const sender = google?.identity?.displayName || state?.identity?.senderName || state?.identity?.businessName || google?.label || "your business";
      const email = google?.identity?.sendAsEmail || google?.identity?.email || google?.label || "connected Gmail";
      notify(`Gmail preview: clients will see ${sender} <${email}>.`, "info");
      return;
    }
    if (provider === "whatsapp") {
      notify(`WhatsApp preview: clients will see ${whatsapp?.identity?.businessName || whatsapp?.identity?.displayName || state?.identity?.businessName || "your WhatsApp Business"} from ${whatsapp?.identity?.phoneNumber || whatsapp?.label || "the connected number"}.`, "info");
      return;
    }
    notify(`Website preview: approved updates will be attributed to ${website?.identity?.businessName || state?.identity?.businessName || "this workspace"} on ${website?.identity?.domain || website?.label || "the connected endpoint"}.`, "info");
  }

  const googleHref = "/api/connections/google/start";
  const google = state?.connections.find(connection => connection.provider === "google" && connection.status === "connected");
  const whatsapp = state?.connections.find(connection => connection.provider === "whatsapp" && connection.status === "connected");
  const website = state?.connections.find(connection => connection.provider === "website" && connection.status === "connected");
  const ai = state?.connections.find(connection => connection.provider === "ai" && connection.status === "connected");
  const identityReady = Boolean(state?.identity?.businessName);
  const memoryFactoryEnabled = Boolean(google?.identity?.memoryFactoryEnabled && google.identity.driveFolderId && google.identity.spreadsheetId);
  const readyCount = [identityReady, Boolean(google), memoryFactoryEnabled, Boolean(whatsapp), Boolean(website), Boolean(ai)].filter(Boolean).length;

  return (
    <section className="connection-center" aria-label="Connect channels">
      <div className="section-head landing-head setup-section-head">
        <div>
          <p className="kicker">connection center</p>
          <h2>Connect channels without touching code.</h2>
          <p>Start with the business identity, then add the channels this workspace will use for drafts, memory, and approved actions.</p>
        </div>
        <div className="setup-readiness" aria-label="Setup readiness">
          <span>{readyCount}/6 ready</span>
          <b>{identityReady && google ? "Ready for Google-backed campaign drafts." : "Identity and Google unlock the cleanest workflow."}</b>
        </div>
      </div>

      <div className="connection-grid">
        <form className="setup-card setup-form setup-card-wide setup-card-priority" onSubmit={saveIdentity}>
          <span>business identity</span>
          <h3>How clients should see this workspace</h3>
          <p>This identity is used by writer co-workers, Gmail drafts, WhatsApp previews, website update attribution, and Drive/Sheets context labels.</p>
          <div className="setup-pills">
            <span className={identityReady ? "status-pill ready" : "status-pill"}>
              {identityReady ? `ready · ${state?.identity?.businessName}` : "required before live external drafts"}
            </span>
          </div>
          <div className="setup-form-grid">
            <label>Business name<input name="businessName" defaultValue={state?.identity?.businessName || ""} placeholder="Your Business Studio" required /></label>
            <label>Public sender name<input name="senderName" defaultValue={state?.identity?.senderName || ""} placeholder="Your Name from Your Business" /></label>
            <label>Reply-to email<input name="replyTo" type="email" defaultValue={state?.identity?.replyTo || ""} placeholder="hello@company.com" /></label>
            <label>Website URL<input name="websiteUrl" type="url" defaultValue={state?.identity?.websiteUrl || ""} placeholder="https://company.com" /></label>
            <label>Brand tone<input name="defaultTone" defaultValue={state?.identity?.defaultTone || ""} placeholder="Warm, concise, expert, low-pressure" /></label>
            <label className="setup-field-span">Default signature/footer<textarea name="defaultSignature" defaultValue={state?.identity?.defaultSignature || ""} placeholder={"Best,\nYour Name"} /></label>
          </div>
          <div className="setup-actions"><button className="btn primary">Save business identity</button></div>
        </form>

        <article className="setup-card setup-channel-card">
          <span>ai provider</span>
          <h3>Customer-owned AI</h3>
          <p>Loopaal trial AI covers the first 5 campaigns. After that, customers connect AI with OAuth or a secure server-side vault. Raw API keys are not stored in the app database.</p>
          <div className="setup-pills">
            <span className={state?.ai?.customerAiConnected ? "status-pill ready" : "status-pill"}>{state?.ai?.customerAiConnected ? `connected · ${state.ai.provider}` : `trial · ${state?.ai?.used || 0}/${state?.ai?.limit || 5} campaigns used`}</span>
            {state?.ai?.requiresCustomerAi ? <span className="status-pill">setup required · trial exhausted</span> : null}
          </div>
          <p className="setup-note-small">Secure rule: use OAuth tokens or vault references only; no browser/local key storage and no raw API keys.</p>
          <div className="setup-actions">
            <button className="btn primary" type="button" onClick={() => connectAiProvider("gemini")}>Connect Gemini with OAuth</button>
            <button className="btn" type="button" onClick={() => connectAiProvider("openai")}>Connect OpenAI with OAuth</button>
            <button className="btn" type="button" onClick={disconnectAiProvider} disabled={!ai}>Disconnect AI</button>
          </div>
        </article>

        <article className="setup-card setup-channel-card">
          <span>google</span>
          <h3>Gmail + Drive</h3>
          <p>Connect a dedicated business Google account. Loopaal uses Gmail compose access to create drafts for review.</p>
          <div className="setup-pills">
            <span className={google ? "status-pill ready" : "status-pill"}>{google ? `connected · ${google.identity?.sendAsEmail || google.identity?.email || google.label}` : "not connected"}</span>
          </div>
          {google ? <p className="setup-note-small">Draft sender: {google.identity?.displayName || state?.identity?.senderName || state?.identity?.businessName || google.label} &lt;{google.identity?.sendAsEmail || google.identity?.email || google.label}&gt;{google.identity?.signature ? " · Gmail signature detected" : ""}</p> : null}
          <div className="setup-actions">
            <a className="btn primary" href={googleHref}>{google ? "Reconnect Google" : "Connect Google"}</a>
            <button className="btn" type="button" onClick={() => previewConnection("google")} disabled={!google}>Test draft preview</button>
          </div>
        </article>

        <article className="setup-card setup-channel-card">
          <span>memory factory</span>
          <h3>Drive + Sheets memory workspace</h3>
          <p>DynamoDB stays the source of truth. Memory Factory unlocks customer-owned context editing, export, and re-import in Drive/Sheets.</p>
          <div className="setup-pills">
            <span className={memoryFactoryEnabled ? "status-pill ready" : "status-pill"}>{memoryFactoryEnabled ? "enabled" : google ? "google connected · not enabled" : "connect google first"}</span>
          </div>
          {google?.identity?.lastMemorySyncError ? <p className="warning-text">Last sync issue: {google.identity.lastMemorySyncError.slice(0, 180)}</p> : null}
          <div className="setup-actions"><button className="btn primary" type="button" onClick={enableMemoryFactory} disabled={!google}>{memoryFactoryEnabled ? "Repair / Re-sync setup" : "Enable Memory Factory"}</button></div>
          {memoryFactoryEnabled ? <div className="row-actions">
            <a className="btn" href={google?.identity?.spreadsheetUrl || "#"} target="_blank" rel="noreferrer">Open Memory Sheet</a>
            <a className="btn" href={google?.identity?.driveFolderUrl || "#"} target="_blank" rel="noreferrer">Open Drive Folder</a>
          </div> : null}
        </article>

        <form className="setup-card setup-form setup-channel-card" onSubmit={event => saveManualConnection(event, "whatsapp")}>
          <span>whatsapp</span>
          <h3>WhatsApp Business</h3>
          <p>Use a WhatsApp Business Cloud API number owned by this customer workspace.</p>
          <div className="setup-pills">
            <span className={whatsapp ? "status-pill ready" : "status-pill"}>{whatsapp ? `connected · ${whatsapp.identity?.businessName || whatsapp.identity?.phoneNumber || whatsapp.label}` : "not connected"}</span>
          </div>
          <label>Public business name<input name="businessName" defaultValue={state?.identity?.businessName || ""} placeholder="Company shown to clients" required /></label>
          <label>Business phone number<input name="phoneNumber" placeholder="+923001234567" /></label>
          <label>Phone number ID<input name="phoneNumberId" placeholder="1234567890" required /></label>
          <label>Access token<input name="accessToken" type="password" placeholder="Meta access token" required /></label>
          <label>Verify token<input name="verifyToken" type="password" placeholder="Webhook verify token" /></label>
          <div className="setup-actions">
            <button className="btn">Save WhatsApp</button>
            <button className="btn" type="button" onClick={() => previewConnection("whatsapp")} disabled={!whatsapp}>Preview identity</button>
          </div>
        </form>

        <form className="setup-card setup-form setup-channel-card" onSubmit={event => saveManualConnection(event, "website")}>
          <span>website</span>
          <h3>Website updates</h3>
          <p>Connect any HTTPS endpoint that can verify Loopaal's signature. Cloudflare works for your setup, but customers can bring any website platform.</p>
          <div className="setup-pills">
            <span className={website ? "status-pill ready" : "status-pill"}>{website ? `connected · ${website.identity?.domain || website.label}` : "not connected"}</span>
          </div>
          <label>Site/business name<input name="businessName" defaultValue={website?.identity?.businessName || state?.identity?.businessName || ""} placeholder="Company site name" required /></label>
          <label>Public website URL<input name="domain" type="url" defaultValue={website?.identity?.domain || ""} placeholder="https://alodust.pages.dev/" /></label>
          <label>Webhook receiver URL<input name="webhookUrl" type="url" defaultValue={website?.identity?.webhookUrl || ""} placeholder="https://loopaal-webhook.example.workers.dev" required /></label>
          <label>Webhook secret<input name="webhookSecret" type="password" placeholder={website ? "Saved secret — leave blank to keep it" : "Shared signing secret"} required={!website} /></label>
          <div className="setup-actions">
            <button className="btn">Save website</button>
            <button className="btn" type="button" onClick={event => event.currentTarget.form ? testWebsiteConnection(event.currentTarget.form) : undefined}>Test webhook</button>
            <button className="btn" type="button" onClick={() => previewConnection("website")} disabled={!website}>Preview identity</button>
          </div>
        </form>
      </div>
      {message ? (
        <aside className={`setup-toast ${messageTone}`} role="status" aria-live="polite">
          <span className="setup-toast-dot" aria-hidden="true" />
          <p>{message}</p>
          <button type="button" onClick={clearNotice} aria-label="Dismiss notification">×</button>
        </aside>
      ) : null}
    </section>
  );
}
