# VEIL — Task Registry

Status: **No tasks created yet.** Authoritative format below. Task creation follows Module Freeze (Phase 4) per the lifecycle (`docs/engineering/WORKFLOW.md`). Do not create implementation tasks before freezes are in place.

## Task Record Format

Every task records:

| Field | Meaning |
|---|---|
| TASK ID | e.g., `T001` |
| MODULE | `M01`…`M11` (see `MODULES.md`) |
| OBJECTIVE | What the implementation achieves |
| OWNER | Employee ID (see `docs/employees/`) — one employee per active task |
| BRANCH | `feature/<module-id>-<task-id>-<short-description>` per `docs/engineering/GIT-STRATEGY.md` |
| INPUTS | Contracts/data this task consumes |
| DEPENDENCIES | Tasks/modules that must precede or are touched |
| FILES/SCOPE | Paths the worker may modify (module's allowed files) |
| INTERFACE USED | Contract IDs from `INTERFACES.md` |
| ACCEPTANCE CRITERIA | Objective, testable completion criteria |
| VALIDATION | Tests to run (see `docs/engineering/QUALITY.md`, `docs/privacy/PRIVACY-TESTING.md`) |
| STATUS | PLANNED / READY / IN_PROGRESS / BLOCKED / IMPLEMENTED / UNDER_REVIEW / VALIDATED / INTEGRATED / DONE |

## Rules (CONFIRMED)

- One employee = one active task.
- One task per branch.
- Do not assign two workers to the same implementation boundary simultaneously unless explicitly coordinated.
- Tasks must be small enough that an AI coding employee can execute them without redesigning the system.
- Do not modify another worker's module (see employee files and `MODULES.md`).
- Status transitions follow `docs/engineering/WORKFLOW.md` and the status vocabulary in former `09-team/status-protocol.md` (PLANNED…DONE).

## Task Rows

| TASK ID | MODULE | OBJECTIVE | OWNER | BRANCH | INPUTS | DEPENDENCIES | FILES/SCOPE | INTERFACE USED | ACCEPTANCE CRITERIA | VALIDATION | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| *(none)* | | | | | | | | | | | |