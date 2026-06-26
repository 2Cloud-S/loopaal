import { integrationStatus } from "../../src/lib/config.ts";

export const dynamic = "force-dynamic";

function StatusPill({ ready, label }: { ready: boolean; label: string }) {
  return <span className={ready ? "status-pill ready" : "status-pill"}>{ready ? "ready" : "not connected"} · {label}</span>;
}

export default function SetupPage() {
  const status = integrationStatus();
  const platformReady = Boolean(status.dynamodb && status.gemini);
  const customerChannelsReady = Boolean(status.gmail || status.whatsapp || status.website);

  return (
    <>
      <nav className="nav landing-nav" aria-label="Loopaal setup">
        <a className="wordmark" href="/">loopaal</a>
        <div className="nav-links">
          <a href="/">product</a>
          <a href="/dashboard">console</a>
        </div>
        <a className="btn compact" href="/dashboard">Open console</a>
      </nav>

      <main className="setup-page">
        <section className="setup-hero">
          <p className="kicker">workspace setup</p>
          <h1>Start safe. Connect channels when ready.</h1>
          <p>
            Loopaal can run campaigns, workers, memory, and drafts with platform services first. Customer-owned channels such as Gmail, WhatsApp, and website updates stay disabled until that workspace connects them.
          </p>
        </section>

        <section className="setup-grid" aria-label="Workspace setup steps">
          <article className="setup-card">
            <span>01</span>
            <h2>Run the core workflow</h2>
            <p>Create a campaign, launch the co-workers, save memory, and generate outreach drafts. This does not require a customer Gmail or WhatsApp account.</p>
            <div className="setup-pills">
              <StatusPill ready={platformReady} label="AI + workspace data" />
            </div>
          </article>

          <article className="setup-card">
            <span>02</span>
            <h2>Connect owned channels</h2>
            <p>Use a dedicated business sender, not a personal inbox. Gmail should use send-only OAuth. WhatsApp and website updates should use business-owned API credentials.</p>
            <div className="setup-pills">
              <StatusPill ready={Boolean(status.gmailReady)} label="Gmail configured" />
              <StatusPill ready={Boolean(status.whatsappReady)} label="WhatsApp configured" />
              <StatusPill ready={Boolean(status.websiteReady)} label="Website webhook configured" />
            </div>
          </article>

          <article className="setup-card">
            <span>03</span>
            <h2>Turn on live actions</h2>
            <p>Approvals can be reviewed any time. Real external sends only execute when live outbound mode is enabled for the workspace.</p>
            <div className="setup-pills">
              <StatusPill ready={Boolean(status.outboundLive)} label="live outbound mode" />
              <StatusPill ready={customerChannelsReady} label="at least one live channel" />
            </div>
          </article>
        </section>

        <section className="setup-note">
          <div>
            <h2>What a non-technical customer does</h2>
            <p>They start with the console, run a campaign in preview mode, review the draft quality, then connect their own business channels before real sends. No one uses the founder’s personal credentials.</p>
          </div>
          <a className="btn primary" href="/dashboard">Continue to console</a>
        </section>
      </main>

      <footer>
        <span>loopaal setup</span>
        <span>customer-owned channels · approval-first actions</span>
      </footer>
    </>
  );
}
