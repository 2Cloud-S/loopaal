# PROJECT_RULES — loopaal Safety and Quality Rules

## Safety

- No invented emails, phone numbers, decision-maker names, or business claims.
- Research output must separate verified facts from unknowns.
- Gmail, WhatsApp, and website changes require approval unless explicitly configured otherwise.
- Outbound copy must avoid guarantees, manipulative urgency, and sensitive-data requests.
- Inbound messages are stored as conversation memory and never auto-trigger external sends.

## Product rules

- Optimize for one minimal operator.
- Make worker activity visible enough for trust, not noisy.
- Treat DynamoDB as the production source of truth.
- Preserve demo mode so the project remains judge-friendly without private credentials.

## Engineering rules

- Keep API responses JSON-serializable.
- Keep worker contracts stable.
- Prefer small deterministic fallbacks when AI or integrations are unavailable.
- Log every meaningful state transition to the audit trail.
