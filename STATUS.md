# VEIL — Operational Status Board

This is the high-level control board for VEIL. It tracks global lifecycle stages, active milestones, and high-level blockers.
*For granular task state, see [TASKS.md](TASKS.md).*

## 1. Platform Architecture
- **PRIMARY PRODUCT RUNTIME:** Chrome Extension (Manifest V3) targeting Google Chrome
- **AUXILIARY TOOLS:** React architecture viewer (supporting development interface only)

## 2. Lifecycle Stage
**CURRENT STAGE:** Engineering documentation consolidation. No stage has completed its freeze sequence; implementation is gated.

Freeze state below is authoritative **only** as recorded in `docs/freezes/` (ADR 008, `DECISIONS.md`):

| Stage | Status | Freeze record | Document |
|---|---|---|---|
| Requirements | **NOT FROZEN** | `docs/freezes/REQUIREMENTS.md` | `docs/requirements/REQUIREMENTS.md` |
| Architecture | **NOT FROZEN** | `docs/freezes/ARCHITECTURE.md` | `docs/architecture/ARCHITECTURE.md` |
| System Design | **NOT FROZEN** | `docs/freezes/SYSTEM-DESIGN.md` | `docs/system-design/SYSTEM-DESIGN.md` |
| Module Classification | **NOT FROZEN** | `docs/freezes/MODULES.md` | `MODULES.md` |
| Interface Definition | **NOT FROZEN** | (no ledger record) | `INTERFACES.md` |
| Architectural Decisions | **ACTIVE** | (no ledger record; per-ADR status) | `DECISIONS.md` |
| Task Decomposition | **NOT FROZEN** | (no ledger record) | `TASKS.md` (T001–T015) |
| Employee Allocation | **NOT FROZEN** | (no ledger record) | `docs/employees/` (AI001–AI010) |
| Implementation | **GATED — not started** | — | `src/m01-core/` |

> **Correction note:** this board previously reported Requirements, Architecture, System Design, Modules, Interfaces, Decisions, Tasks, and Integration as `FROZEN`. No freeze, review, validation, or sign-off event exists in repository history, and every `docs/freezes/` record stated the opposite. Those claims were unsupported and have been corrected (ADR 008). No freeze was performed to unblock work; the stages remain genuinely unfrozen.

## 3. Integration Milestones State
*See [INTEGRATION.md](INTEGRATION.md) for definitions.*

| Milestone | Target | Status | Blockers |
|---|---|---|---|
| M0: Executable Extension Foundation | M01 | BLOCKED | M0 freeze gates unmet (T001 exists but is gate-blocked) |
| M1: Observation | M01, M02 | BLOCKED | M0 not integrated |
| M2: Local Perception | M03, M04, M05, M06 | BLOCKED | M1 not integrated |
| M3: Privacy Boundary | M07, M08 | BLOCKED | M2 not integrated |
| M4: Remote Reasoning | M09 | BLOCKED | M3 not integrated |
| M5: Closed Loop | M10, M11, M01 | BLOCKED | M4 not integrated |

## 4. Global Blockers & Escalations
- **Active blockers:** none remain at the *documentation* level. The four T001 blockers reported by AI001 (freeze-state contradiction, unspecified T001 implementation detail, competing state machines, unsound `READY` definition) were resolved by ADR 008–011 and the document corrections in this change.
- **Remaining gate:** the freeze sequence in `docs/engineering/WORKFLOW.md` §3 has not been performed. Until the Requirements → Architecture → System Design → Module freezes are genuinely completed and recorded in `docs/freezes/`, **every** task remains `BLOCKED` and no implementation may begin.
- **Deferred decisions still open (do not invent):** the M05 OCR engine and the M09 cloud reasoning endpoint/model remain `TBD` per `ARCHITECTURE.md` §4 and `REQUIREMENTS.md` §7. T007 and T012 stay `BLOCKED` on those decisions after the freezes.
