# PROJECT_RULES — loopaal Safety and Quality Rules

## Safety

- No invented emails, phone numbers, decision-maker names, or business claims.
- Research output must separate verified facts from unknowns.
- Gmail, WhatsApp, and website changes require approval unless explicitly configured otherwise.
- External actions must remain in preview mode unless the workspace explicitly enables live outbound sends.
- Gmail sending must use the narrow `gmail.send` scope and should use a dedicated Loopaal mailbox, not a personal main inbox.
- Outbound copy must avoid guarantees, manipulative urgency, and sensitive-data requests.
- Inbound messages are stored as conversation memory and never auto-trigger external sends.

## Product rules

- Optimize for one minimal operator.
- Make worker activity visible enough for trust, not noisy.
- Treat DynamoDB as the production source of truth.
- Never replace DynamoDB with Sheets/Drive as the source of truth.
- Memory Factory features are gated behind a user-owned Google Drive/Sheets connection.
- User-edited Sheet data must be validated before it updates DynamoDB.
- Preserve preview mode so the product remains safe without private outbound credentials.

## Engineering rules

- Keep API responses JSON-serializable.
- Keep worker contracts stable.
- Prefer small deterministic fallbacks when AI or integrations are unavailable.
- Log every meaningful state transition to the audit trail.
