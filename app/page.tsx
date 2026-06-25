export default function Page() {
  const workers = [
    ["01", "researcher", "Finds prospect records from your criteria without inventing contacts."],
    ["02", "analyst", "Scores fit, confidence, and the safest outreach angle."],
    ["03", "writer", "Drafts email and WhatsApp copy from verified context."],
    ["04", "archivist", "Turns campaigns, replies, and outcomes into reusable memory."],
    ["05", "scheduler", "Prepares follow-up timing after a human approves the action."],
    ["06", "reply-handler", "Classifies replies and proposes the next supervised step."]
  ];

  return (
    <>
      <nav className="nav landing-nav" aria-label="Loopaal">
        <a className="wordmark" href="/">loopaal</a>
        <div className="nav-links">
          <a href="#workflow">workflow</a>
          <a href="#safety">safety</a>
          <a href="/dashboard">console</a>
        </div>
        <a className="btn compact" href="/dashboard">Launch demo</a>
      </nav>

      <main className="landing">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="kicker">supervised revenue automation</p>
            <h1>One operator. Six co-workers.</h1>
            <p className="hero-lede">
              Loopaal turns volatile B2B targeting criteria into researched prospects, contextual outreach, durable memory, and approval-gated actions.
            </p>
            <div className="hero-actions">
              <a className="btn primary" href="/dashboard">Launch workflow</a>
              <a className="btn" href="#workflow">See how it runs</a>
            </div>
          </div>

          <aside className="hero-console" aria-label="Loopaal workflow preview">
            <div className="console-line console-muted">operator / campaign</div>
            <div className="console-command">target: healthcare services · United States · owners</div>
            <div className="console-grid">
              <span>researcher</span><b>complete</b>
              <span>analyst</span><b>complete</b>
              <span>writer</span><b>gemini draft</b>
              <span>approval</span><b>pending human</b>
            </div>
            <div className="console-output">No external send happens until the operator approves it.</div>
          </aside>
        </section>

        <section className="primitive-strip" id="workflow" aria-label="Loopaal workflow primitives">
          <div className="section-head landing-head">
            <div>
              <h2>Any campaign. One supervised loop.</h2>
              <p>Instead of one giant agent, Loopaal routes work through small co-workers with visible outputs.</p>
            </div>
          </div>

          <div className="worker-grid">
            {workers.map(([index, title, text]) => (
              <article className="worker-card" key={title}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flow-board" aria-label="Workflow board">
          <div className="flow-column">
            <p className="kicker">input</p>
            <h2>Describe the market.</h2>
            <p>Names, industries, countries, decision makers, offer, and notes can change every run.</p>
          </div>
          <div className="flow-steps">
            <div><span>criteria</span><b>normalize</b></div>
            <div><span>co-workers</span><b>parallel run</b></div>
            <div><span>memory</span><b>save context</b></div>
            <div><span>outreach</span><b>draft only</b></div>
            <div><span>approval</span><b>send gate</b></div>
          </div>
        </section>

        <section className="safety-panel" id="safety">
          <div>
            <p className="kicker">trust layer</p>
            <h2>Automation with brakes.</h2>
          </div>
          <div className="safety-copy">
            <p>Loopaal can research, analyze, and draft automatically. External actions such as email, WhatsApp, and website updates remain human-approved by default.</p>
            <p>For privacy, Gmail should use a dedicated sending mailbox with the narrow send-only scope, not a personal inbox.</p>
          </div>
        </section>
      </main>

      <footer>
        <span>loopaal</span>
        <span>approval-first business automation</span>
      </footer>
    </>
  );
}
