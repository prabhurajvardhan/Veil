# VEIL — Engineering Workflow (Lifecycle)

Status: CONFIRMED lifecycle shape from brief; current phase: Phase 1 (Requirements drafted, NOT frozen).

## 1. Phases

| Phase | Deliverable | Gate |
|---|---|---|
| Phase 1 — Requirements | `docs/requirements/REQUIREMENTS.md` | Requirement review & freeze |
| Phase 2 — Architecture | `docs/architecture/ARCHITECTURE.md`, `DEPENDENCIES.md` | Architecture V0→V1→V2→V3→freeze |
| Phase 3 — System Design | `docs/system-design/SYSTEM-DESIGN.md`, `INTERFACES.md` | System Design freeze |
| Phase 4 — Module Classification | `MODULES.md` | Module freeze |
| Phase 5 — Task Planning | `TASKS.md` | Task review |
| Phase 6 — Employee Allocation | `docs/employees/*` | Allocation confirmed |
| Phase 7 — Implementation | `src/` per module | Per-task done |
| Phase 8 — Integration | integrated `src/` | Integration tests pass |
| Phase 9 — Validation | evidence in `STATUS.md` | Acceptance + privacy + failure tests pass |
| Phase 10 — V1 Release | released artifact | Release criteria |

Architecture and System Design each follow: **V0 → validation → V1 → validation → V2 → validation → V3 → validation → FREEZE**. Do not jump to implementation while architectural uncertainty remains.

## 2. Per-Phase Operating Procedure

For each phase: **DEFINE → REVIEW → VALIDATE → FREEZE.**

```
DEFINE     produce/update the phase artifact
REVIEW     team/employee review against the upstream frozen artifact
VALIDATE   explicit validation items completed (no fabrication of evidence)
FREEZE     update the corresponding docs/freezes/<X>.md record
```

## 3. Freeze Order (CONFIRMED)

Requirements Freeze → Architecture Freeze → System Design Freeze → Module Freeze → tasks → implementation.
No downstream phase may begin ahead of the required freeze. See `docs/freezes/` records.

## 4. Change Control

- No downstream phase may silently modify an upstream frozen artifact.
- If a critical problem requires an architectural change: **STOP → document the problem → create a decision (ADR in `DECISIONS.md`) → update affected artifacts → revalidate → refreeze.**
- Once a freeze is marked frozen, any requirement/architecture/design change must be logged through the decision process (per the change-policy section of each freeze record).

## 5. Worker Discipline (CONFIRMED)

- One employee = one active task.
- No two workers assigned to the same implementation boundary simultaneously unless explicitly coordinated.
- Workers operate inside defined boundaries (see their employee file and `MODULES.md`).
- Workers do not redesign the architecture; changes happen through controlled review.
- Repository documents are the communication channel; task status lives in `TASKS.md`/`STATUS.md`.

## 6. Definition of Done (PROPOSED)

- **Module:** interface contract implemented per `INTERFACES.md`; unit tests pass; no known privacy-boundary violation introduced.
- **Integration:** modules connect per `DEPENDENCIES.md` without violating its forbidden list; integration tests pass.
- **V1:** full closed loop completes for at least one real task; all ten acceptance scenarios pass; privacy testing shows no raw sensitive data crossing the boundary.

## 7. Current Phase

Phase 1 (Requirements) is drafted and **not frozen**. Architecture/design/module records are V0 drafts. No implementation may begin.