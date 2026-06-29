const workerStreams = [
  ["research", "find verified targets"],
  ["analysis", "score fit and risk"],
  ["writing", "shape channel drafts"],
  ["memory", "preserve context"],
  ["schedule", "prepare follow-up"],
  ["replies", "classify responses"],
];

const services = [
  ["Research", "Prospect discovery from volatile industries, countries, roles, and notes."],
  ["Memory Factory", "Editable Drive and Sheets context layer after the customer connects Google."],
  ["Drafting", "Gmail and WhatsApp copy written from verified prospect and workspace identity."],
  ["Approvals", "Human gates before external messages, website changes, or channel actions."],
  ["Replies", "Inbound response classification with proposed next steps."],
  ["Channels", "Customer-owned Gmail, WhatsApp, website, Drive, and Sheets connections."],
];

const journey = [
  ["setup", "Connect business identity and owned channels."],
  ["campaign", "Enter criteria once; co-workers split the work."],
  ["approval", "Review each draft and action before it leaves."],
  ["memory", "Save canonical records and optional editable context."],
];

const productStates = [
  ["criteria received", "volatile input normalized"],
  ["co-workers active", "six small jobs in parallel"],
  ["draft ready", "recipient and source context visible"],
  ["memory synced", "DynamoDB first, Sheets optional"],
];

function ConvergenceGraphic() {
  return (
    <svg
      className="convergence-svg"
      viewBox="0 0 980 760"
      role="img"
      aria-label="Six Loopaal co-worker streams converging into one approval spine"
    >
      <defs>
        <path id="stream-research" d="M96 112 C96 260 190 318 326 378 C422 420 460 474 490 548" />
        <path id="stream-analysis" d="M248 112 C244 258 346 310 416 388 C458 434 478 490 490 548" />
        <path id="stream-writing" d="M490 88 L490 548" />
        <path id="stream-memory" d="M732 112 C730 258 616 320 558 392 C516 444 500 494 490 548" />
        <path id="stream-schedule" d="M884 112 C884 282 762 344 640 406 C552 450 510 506 490 548" />
        <path id="stream-replies" d="M610 164 C610 288 528 338 504 430 C494 468 490 506 490 548" />
      </defs>

      <g className="convergence-plate" aria-hidden="true">
        <path d="M92 58 H888 L928 100 H52 Z" />
      </g>

      <g className="stream-lines">
        <use href="#stream-research" />
        <use href="#stream-analysis" />
        <use href="#stream-writing" />
        <use href="#stream-memory" />
        <use href="#stream-schedule" />
        <use href="#stream-replies" />
      </g>

      <g className="stream-dots" aria-hidden="true">
        <circle r="9"><animateMotion dur="7.5s" repeatCount="indefinite"><mpath href="#stream-research" /></animateMotion></circle>
        <circle r="9"><animateMotion dur="8s" begin="-.7s" repeatCount="indefinite"><mpath href="#stream-analysis" /></animateMotion></circle>
        <circle r="9"><animateMotion dur="6.6s" begin="-1.4s" repeatCount="indefinite"><mpath href="#stream-writing" /></animateMotion></circle>
        <circle r="9"><animateMotion dur="7.8s" begin="-2.1s" repeatCount="indefinite"><mpath href="#stream-memory" /></animateMotion></circle>
        <circle r="9"><animateMotion dur="8.4s" begin="-2.8s" repeatCount="indefinite"><mpath href="#stream-schedule" /></animateMotion></circle>
        <circle r="9"><animateMotion dur="7.2s" begin="-3.5s" repeatCount="indefinite"><mpath href="#stream-replies" /></animateMotion></circle>
      </g>

      <g className="stream-starts" aria-hidden="true">
        <circle cx="96" cy="112" r="11" />
        <circle cx="248" cy="112" r="11" />
        <circle cx="490" cy="88" r="11" />
        <circle cx="732" cy="112" r="11" />
        <circle cx="884" cy="112" r="11" />
        <circle cx="610" cy="164" r="11" />
      </g>

      <g className="approval-spine" aria-hidden="true">
        <path d="M490 548 L490 716" />
        <circle cx="490" cy="548" r="13" />
        <circle cx="490" cy="594" r="10" />
        <circle cx="490" cy="640" r="10" />
        <circle cx="490" cy="686" r="10" />
        <path className="spine-coil" d="M490 608 C458 608 458 620 490 620 C522 620 522 632 490 632 C458 632 458 644 490 644 C522 644 522 656 490 656" />
      </g>
    </svg>
  );
}

export default function Page() {
  return (
    <>
      <nav className="nav landing-nav" aria-label="Loopaal">
        <a className="wordmark" href="/">loopaal</a>
        <div className="nav-links">
          <a href="#streams">streams</a>
          <a href="#services">services</a>
          <a href="#journey">journey</a>
          <a href="#product">product</a>
          <a href="#safety">safety</a>
          <a href="/sign-in">sign in</a>
        </div>
        <a className="btn compact" href="/sign-up">Start setup</a>
      </nav>

      <main className="landing convergence-landing">
        <section className="convergence-hero">
          <div className="hero-copy">
            <p className="kicker">supervised revenue automation</p>
            <h1>Many signals. One safe loop.</h1>
            <p className="hero-lede">
              Loopaal turns changing B2B criteria into co-worker streams that converge into memory,
              drafts, approvals, and customer-owned channel actions.
            </p>
            <div className="hero-actions">
              <a className="btn primary" href="/sign-up">Start onboarding</a>
              <a className="btn" href="/dashboard">View workflow</a>
              <a className="btn" href="/setup">Open setup</a>
            </div>
          </div>

          <div className="convergence-stage" aria-label="Animated Loopaal operating model">
            <ConvergenceGraphic />
            <div className="stage-caption">
              <span>six co-workers converge</span>
              <b>approval spine stays visible</b>
            </div>
          </div>
        </section>

        <section className="stream-index" id="streams">
          <div className="stream-index-copy">
            <p className="kicker">co-worker streams</p>
            <h2>The work moves before anything is sent.</h2>
          </div>
          <div className="stream-list">
            {workerStreams.map(([title, text], index) => (
              <article className="stream-item" key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="service-switchboard" id="services">
          <div className="section-head landing-head">
            <div>
              <p className="kicker">service menu</p>
              <h2>Route only the work the customer is ready to run.</h2>
            </div>
            <p>Each service can operate in preview; owned channels unlock the live path.</p>
          </div>

          <div className="service-tabs" aria-label="Loopaal service capabilities">
            {services.map(([title, text]) => (
              <article className="service-tab" key={title}>
                <span>{title}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="spine-journey" id="journey">
          <div className="journey-line" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="journey-copy">
            <p className="kicker">customer journey</p>
            <h2>A single spine from setup to memory.</h2>
            <p>
              The homepage motion mirrors the actual product: every campaign writes to the operational
              database first, then optional customer-owned memory tools can export, edit, and re-import context.
            </p>
          </div>
          <div className="journey-cards">
            {journey.map(([title, text]) => (
              <article className="journey-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="product-motion" id="product">
          <div className="product-motion-copy">
            <p className="kicker">inside the product</p>
            <h2>States reveal themselves instead of hiding inside a black box.</h2>
            <p>No separate judge mode. The same workflow is shown to customers: criteria, co-workers, drafts, approvals, and memory.</p>
          </div>

          <div className="signal-board" aria-label="Loopaal product state preview">
            {productStates.map(([state, detail]) => (
              <div className="signal-row" key={state}>
                <span>{state}</span>
                <b>{detail}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="safety-panel safety-grid" id="safety">
          <div>
            <p className="kicker">trust layer</p>
            <h2>Motion never means silent sending.</h2>
          </div>
          <div className="safety-copy safety-cards">
            <article>
              <h3>Customer-owned identity</h3>
              <p>Outreach uses the connected business sender, signature, phone, website, and Drive destination.</p>
            </article>
            <article>
              <h3>Approval-gated actions</h3>
              <p>Research and drafting can run automatically; external actions wait for explicit approval.</p>
            </article>
            <article>
              <h3>Editable memory, safely</h3>
              <p>DynamoDB remains canonical while Drive and Sheets become optional customer-owned context tools.</p>
            </article>
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
