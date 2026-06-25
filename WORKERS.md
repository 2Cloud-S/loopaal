# WORKERS — loopaal Co-worker System

## Contract

Every worker exports:

- `workerId`
- `description`
- `run(input): Promise<WorkerResult>`

`WorkerInput` contains campaign criteria, the active campaign, current prospects, memory, and optional channel. `WorkerResult` contains status, summary, artifacts, and optional audit messages.

## Initial co-workers

- `researcher`: creates prospect records from supplied business names and criteria without guessing private contact data.
- `analyst`: scores fit and confidence, then proposes an outreach angle.
- `writer`: drafts respectful email or WhatsApp copy from verified data.
- `archivist`: converts the campaign run into durable memory.
- `scheduler`: proposes follow-up approval records.
- `reply-handler`: classifies inbound replies and proposes next actions.

## Failure behavior

Workers run with `Promise.allSettled()`. A failed worker creates a failed job and audit event; other workers continue. This gives the demo a resilient “small team working in parallel” story instead of a brittle single-agent chain.

## Repo strategy

The `workers/` directory is structured as its own package now. When GitHub credentials are ready, create a public `workers` repo, move this directory there, then add it back to loopaal as a Git submodule at the same path.
