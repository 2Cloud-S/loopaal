import { integrationStatus } from "../../src/lib/config.ts";
import { aiTrialStatus } from "../../src/lib/ai-security.ts";
import { requirePageUser, workspaceIdForUser } from "../../src/lib/auth.ts";
import { loadState } from "../../src/lib/repository.ts";
import { OnboardingGuide } from "../onboarding-guide.tsx";
import { SetupClient } from "./setup-client.tsx";

export const dynamic = "force-dynamic";

function StatusPill({ ready, label }: { ready: boolean; label: string }) {
  return <span className={ready ? "status-pill ready" : "status-pill"}>{ready ? "ready" : "not connected"} · {label}</span>;
}

export default async function SetupPage() {
  const user = await requirePageUser();
  const workspaceId = user ? workspaceIdForUser(user) : undefined;
  const state = workspaceId ? await loadState(workspaceId) : undefined;
  const status = integrationStatus();
  const google = state?.connections.find(connection => connection.provider === "google" && connection.status === "connected");
  const whatsapp = state?.connections.find(connection => connection.provider === "whatsapp" && connection.status === "connected");
  const website = state?.connections.find(connection => connection.provider === "website" && connection.status === "connected");
  const ai = state ? aiTrialStatus(state) : undefined;
  const platformReady = Boolean(status.dynamodb && status.gemini);
  const customerChannelsReady = Boolean(google || whatsapp || website || status.gmail || status.whatsapp || status.website);

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
            Loopaal can run campaigns, workers, memory, and drafts with platform services first.
            Customer-owned channels stay disabled until the workspace connects them.
          </p>
          <div className="setup-hero-strip" aria-label="Setup sequence">
            <span>identity</span>
            <span>google</span>
            <span>memory</span>
            <span>channels</span>
            <span>approval</span>
          </div>
        </section>

        <section className="setup-grid" aria-label="Workspace setup steps">
          <article className="setup-card setup-step-card">
            <span>01</span>
            <h2>Run the core workflow</h2>
            <p>Create a campaign, launch the co-workers, save memory, and generate outreach drafts before connecting live channels.</p>
            <div className="setup-pills">
              <StatusPill ready={platformReady} label="AI + workspace data" />
              <StatusPill ready={Boolean(ai && !ai.requiresCustomerAi)} label={`Loopaal AI trial ${ai?.used || 0}/${ai?.limit || 5}`} />
            </div>
          </article>

          <article className="setup-card setup-step-card">
            <span>02</span>
            <h2>Connect owned channels</h2>
            <p>Connect a dedicated business sender and any business-owned APIs the workspace will use for approved actions.</p>
            <div className="setup-pills">
              <StatusPill ready={Boolean(google || status.gmailReady)} label="Gmail configured" />
              <StatusPill ready={Boolean(whatsapp || status.whatsappReady)} label="WhatsApp configured" />
              <StatusPill ready={Boolean(website || status.websiteReady)} label="Website webhook configured" />
            </div>
          </article>

          <article className="setup-card setup-step-card">
            <span>03</span>
            <h2>Turn on live actions</h2>
            <p>Approvals can be reviewed any time. Real external sends only execute when live outbound mode is enabled for the workspace.</p>
            <div className="setup-pills">
              <StatusPill ready={Boolean(status.outboundLive)} label="live outbound mode" />
              <StatusPill ready={customerChannelsReady} label="at least one live channel" />
            </div>
          </article>
        </section>

        <SetupClient />
        <OnboardingGuide surface="setup" />

        <section className="setup-note">
          <div>
            <h2>What a non-technical customer does</h2>
            <p>They start with the console, run a campaign in preview mode, review draft quality, then connect their own business channels before real sends.</p>
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
