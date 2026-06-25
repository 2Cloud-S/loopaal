# PRD — loopaal H0 Hackathon Build

## Product position

loopaal is a supervised AI revenue-ops agent for lean B2B teams. It turns a volatile campaign brief — businesses, industries, countries, decision-maker roles, offer, and notes — into researched prospects, adaptive outreach drafts, approval-gated follow-ups, durable memory, and an audit trail.

## Target users

- Small business owners who want outreach without hiring a full sales-ops team.
- Agencies that need repeatable prospecting and client communication workflows.
- Solo operators who need automation but still want control over sends and website changes.

## Hackathon track

Track 2: Monetizable B2B App.

## Demo story

1. Operator creates a campaign for a target market.
2. loopaal launches parallel co-workers: researcher, analyst, writer, archivist, scheduler.
3. Co-workers persist job state and results to DynamoDB.
4. Dashboard shows prospects, worker activity, memory, approvals, and audit events.
5. Operator approves a proposed outreach draft; loopaal records the scheduled action.

## Success criteria

- The app runs locally and can deploy on Vercel.
- DynamoDB is the primary production persistence layer.
- Sensitive sends and website changes require explicit approval.
- The demo can be explained in under three minutes.
- Documentation clearly maps the implementation to H0 requirements.
