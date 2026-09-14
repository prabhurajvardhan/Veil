# Git Strategy

## Context
CONFIRMED: this repository is shared by six people and potentially multiple concurrent AI coding sessions. Strict branch isolation is required.

## main
- Always stable.
- Never a target for direct feature development or direct commits.

## Feature Branches
Naming: `feature/<module-id>-<short-task-name>`
Example: `feature/VEIL-PERCEPTION-001-showui-adapter`

Module IDs come from `06-modules/module-registry.md` (e.g., VEIL-OBS, VEIL-PERCEPTION, VEIL-FUSION, VEIL-PRIVACY, VEIL-REASONING, VEIL-VALIDATION, VEIL-EXECUTION, VEIL-STATE).

Each worker/session gets its own branch/workspace. No two workers should modify the same module simultaneously unless explicitly coordinated (see `conflict-resolution.md`).

## Task Identification
Every task must identify:
- task ID
- module
- owner
- branch
- expected files
- dependencies
- acceptance criteria

See `09-team/task-registry.md` for the authoritative task format.

## Branch Lifecycle
- Branch creation: from an up-to-date `main`, named per the convention above.
- Commits: small, single-purpose, referencing the task ID.
- Commit message format: see `commit-strategy.md`.
- Pull requests: see `pull-request-strategy.md`.
- Review: required before merge (reviewer role — see `09-team/role-definitions.md`).
- CI validation: UNKNOWN — no CI pipeline defined yet; VALIDATION REQUIRED.
- Merge requirements: see `merge-policy.md`.
- Conflict resolution: see `conflict-resolution.md`.
- Rollback: see `recovery-and-rollback.md`.
- Abandoned branch handling: UNKNOWN — no concrete staleness window defined yet; PROPOSED that an abandoned branch be flagged for review after a period of inactivity (period: UNKNOWN).
- Emergency fixes: PROPOSED — an emergency fix still goes through a feature branch and PR; direct `main` commits remain prohibited even in emergencies, given the explicit prohibition below.

## Explicitly Prohibited
CONFIRMED, verbatim from brief:
- Force-pushing shared branches.
- Committing secrets.
- Direct commits to `main`.
- Unrelated changes bundled into a task's branch/PR.
- Modifying another employee's module without coordination.
- Giant mixed-purpose commits.
