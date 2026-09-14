# Role Definitions

CONFIRMED role categories named in brief (responsibilities are PROPOSED elaborations, not verbatim from the brief unless noted):

## Principal Architect
CONFIRMED role (this documentation task itself was scoped to this role). Owns architecture and system design documentation; resolves cross-module architectural conflicts.

## Module Owner
PROPOSED: owns one or more modules from `06-modules/module-registry.md`; final say on conflicts within their module (see `08-git/conflict-resolution.md`).

## Reviewer
PROPOSED: reviews PRs per `08-git/pull-request-strategy.md` before merge.

## Integration Owner
PROPOSED: responsible for integration strategy (`10-quality/integration-strategy.md`) and resolving cross-module integration issues.

## QA / Validation Responsibility
PROPOSED: owns execution of `10-quality/test-strategy.md`, `privacy-testing.md`, `acceptance-tests.md`.

## AI Coding Employee Responsibility
PROPOSED: implements assigned tasks from `task-registry.md` within the branch/module boundaries defined in `08-git/`, without modifying other modules without coordination.
