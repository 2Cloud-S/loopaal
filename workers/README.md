# @loopaal/workers

This package is the future standalone `workers` GitHub repository. It is kept inside loopaal for the hackathon implementation, then can be moved into a separate public repo and added back as a Git submodule at `workers/`.

Each worker is deterministic by default so the H0 demo works without private AI or messaging credentials. Production deployments can replace the internals while keeping the same `WorkerInput` and `WorkerResult` contract.
