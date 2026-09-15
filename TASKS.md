# VEIL — Task Registry

**Status:** NOT FROZEN — V0 draft. Freeze state is authoritative only in `docs/freezes/`; task decomposition is gated by the upstream stage freezes (ADR 008 in `DECISIONS.md`).
**Authority:** Derived from `docs/architecture/ARCHITECTURE.md` and `MODULES.md`.

---

## 1. Centralized Platform & Runtime Constraints
All tasks indexed in this registry inherit the following mandatory architectural constraints:

- **PLATFORM:** Chrome Extension — Manifest V3 (MV3)
- **PRIMARY TARGET:** Google Chrome (Desktop)
- **PRIMARY RUNTIME:** Browser-side VEIL extension runtime (Service Worker, Offscreen Document, or Popup) unless a task explicitly specifies that the component is a remote cloud service (e.g., cloud LLM backend for T012).
- **NON-REPLACEMENT RULE:** Every implementation task must be implemented within the VEIL Chrome Extension architecture. A standalone web application is **NOT** an acceptable replacement for any assigned browser-runtime capability.

---

## 2. Canonical Task States

Task state is a **gated** property, not a scheduling preference. A task is `READY` only when every condition below is satisfied; otherwise it is `BLOCKED`.

| State | Meaning |
|---|---|
| `BLOCKED` | At least one readiness condition is unmet. **Must not be started.** |
| `READY` | Every readiness condition is met. May be started, and is the only startable state. |
| `IN_PROGRESS` | Actively being implemented by the owner. |
| `VALIDATED` | Implemented and locally tested against the task's acceptance criteria. |
| `INTEGRATED` | Consumed successfully by its integration milestone. |

### 2.1 Readiness Conditions (all required for `READY`)

A task may be marked `READY` only if **all** of the following hold:

1. **Freeze gates met.** Every upstream stage freeze required by `docs/engineering/WORKFLOW.md` §3 has been recorded in `docs/freezes/` (ADR 008).
2. **Dependencies complete.** Every task listed in its Dependencies table has reached `INTEGRATED`.
3. **Architecture resolved.** No unresolved architectural question bears on the task.
4. **System design resolved.** The design detail the task implements is specified, not `TBD`.
5. **Interfaces resolved.** Every input and output the task touches is defined in `INTERFACES.md`.
6. **Technology resolved.** Every technology the task uses is named and decided (no `TBD`/`UNKNOWN` in the task's critical path).
7. **File boundaries explicit.** The exact files to create and modify are enumerated, and forbidden paths are stated.
8. **Acceptance criteria defined.** Objective, testable acceptance criteria exist in the task document.
9. **Validation method defined.** The exact test framework, command, and test boundaries are stated.
10. **Mandatory references present.** Every referenced document exists and contains the cited section.

If any condition fails, the task state **must** be `BLOCKED`, with the failing condition recorded.

### 2.2 Transition Rules

- `BLOCKED → READY`: only when conditions 1–10 above are all satisfied. An owner may not promote a task by assuming a missing decision.
- `READY → IN_PROGRESS`: on implementation start.
- `IN_PROGRESS → BLOCKED`: immediately, if a prerequisite is discovered to be missing or non-functional.
- `IN_PROGRESS → VALIDATED`: only after the task's Validation Procedure passes locally, with actual test output.
- `VALIDATED → INTEGRATED`: only after the integration milestone's exit conditions (`INTEGRATION.md`) are met.
- Promoting downstream tasks `BLOCKED → READY` is permitted only when **all** their dependencies are `INTEGRATED`.

### 2.3 Note on Dependencies

A dependency is a **real** data/artifact dependency, not a scheduling artefact. Naming a task in this registry does not grant its owner permission to begin it.

---

## 3. Active Tasks (DAG)

| TASK ID | TASK NAME | OWNER | MODULE | DEPENDENCIES | STATE |
|---|---|---|---|---|---|
| [T001](docs/tasks/T001.md) | Implement Extension Shell | AI001 | M01 | None | BLOCKED |
| [T002](docs/tasks/T002.md) | Implement Orchestrator State Machine | AI001 | M01 | T001 | BLOCKED |
| [T003](docs/tasks/T003.md) | Implement Screenshot Capture | AI002 | M02 | T001 | BLOCKED |
| [T004](docs/tasks/T004.md) | Implement DOM/A11y Capture | AI002 | M02 | T001 | BLOCKED |
| [T005](docs/tasks/T005.md) | Implement Visual Grounding Adapter | AI003 | M03 | T003 | BLOCKED |
| [T006](docs/tasks/T006.md) | Implement DOM Evidence Extraction | AI004 | M04 | T004 | BLOCKED |
| [T007](docs/tasks/T007.md) | Implement OCR Extraction | AI004 | M05 | T003 | BLOCKED |
| [T008](docs/tasks/T008.md) | Implement Perception Fusion Logic | AI005 | M06 | T005, T006, T007 | BLOCKED |
| [T009](docs/tasks/T009.md) | Implement Conflict Resolution & Confidence | AI005 | M06 | T008 | BLOCKED |
| [T010](docs/tasks/T010.md) | Implement Privacy Classification Rules | AI006 | M07 | T009 | BLOCKED |
| [T011](docs/tasks/T011.md) | Implement Visual Masking & DOM Redaction | AI007 | M08 | T010 | BLOCKED |
| [T012](docs/tasks/T012.md) | Implement Remote Reasoner Network Client | AI008 | M09 | T011 | BLOCKED |
| [T013](docs/tasks/T013.md) | Implement Local Action Guard (Staleness & Validation) | AI009 | M10 | T012, T002 | BLOCKED |
| [T014](docs/tasks/T014.md) | Implement Browser Execution Adapter | AI010 | M11 | T013 | BLOCKED |
| [T015](docs/tasks/T015.md) | Implement E2E Verification Loop | AI001 | M01 | T014 | BLOCKED |

---

## 3.1 Implementation-State Note (T001 / T002)

A direct commit to `main` (`fa42f97 feat: implement extension shell and orchestrator`) added `manifest.json`, `src/m01-core/background.ts`, `src/m01-core/stateMachine.ts` and build configuration, and marked T001/T002 `VALIDATED` and T003/T004 `READY`.

This PR deliberately does **not** carry that status forward, for two reasons:

1. **The freeze gate is still unmet** (`docs/freezes/`; ADR 008). `VALIDATED` requires the task's acceptance criteria to pass against a frozen specification (`TASKS.md` §2.2), and the stage freezes required by `docs/engineering/WORKFLOW.md` §3 have not been recorded. `READY` likewise requires the freeze condition (§2.1 condition 1).
2. **The committed implementation deviates from binding ADR 010** — see `docs/tasks/T001.md` §20.

The implementation code is preserved by the merge. Resolving the deviation is **T002/T001 rework**, tracked in `docs/tasks/T001.md` §20 — not a documentation change, and not performed here.

---

## 4. Execution Rules
1. Only tasks with `STATE = READY` may be executed.
2. An assigned task that is `BLOCKED` must not be started; see the readiness conditions in §2.
3. Every task must be implemented strictly within its assigned module's allowed file paths.
4. No task may alter architecture or interface contracts without an approved ADR.
