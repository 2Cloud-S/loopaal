# PRD — loopaal Product Requirements

## Product position

loopaal is a supervised AI revenue-ops agent for lean B2B teams. It turns a volatile campaign brief — businesses, industries, countries, decision-maker roles, offer, and notes — into researched prospects, adaptive outreach drafts, approval-gated follow-ups, durable memory, and an audit trail.

The product is workspace-first: customers can run the core campaign workflow immediately, then connect their own outbound channels before any real external send executes.

## Target users

- Small business owners who want outreach without hiring a full sales-ops team.
- Agencies that need repeatable prospecting and client communication workflows.
- Solo operators who need automation but still want control over sends and website changes.
- Non-technical operators who need guided setup rather than cloud-console or `.env` work.

## Hackathon track

Track 2: Monetizable B2B App.

## Product story

1. Operator opens workspace setup and sees which platform services and owned channels are ready.
2. Operator creates a campaign for a target market.
3. loopaal launches parallel co-workers: researcher, analyst, writer, archivist, scheduler.
4. Co-workers persist job state and results.
5. Dashboard shows prospects, worker activity, memory, approvals, and audit events.
6. Operator approves a proposed outreach draft.
7. If the workspace has live owned channels, loopaal executes the action; otherwise it remains a safe preview.

## Success criteria

- The app runs locally and can deploy on Vercel.
- DynamoDB is the primary production persistence layer.
- Sensitive sends and website changes require explicit approval.
- Customer-owned channels must be connected before live outbound actions.
- Platform credentials must not be treated as a consumer's sender identity.
- The demo can be explained in under three minutes.
- Documentation clearly maps the implementation to H0 requirements.
