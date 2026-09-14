# Branch Strategy

## Naming Convention
CONFIRMED: `feature/<module-id>-<short-task-name>` (e.g., `feature/VEIL-PERCEPTION-001-showui-adapter`).

## Ownership
One branch/workspace per worker/session, mapped to exactly one module/task at a time. No two workers modify the same module simultaneously without explicit coordination.

## main
Always stable; never a direct development target.

## Open Questions
- UNKNOWN: whether an integration/staging branch exists between feature branches and `main` — not specified in the brief.
