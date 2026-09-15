# VEIL — Task Registry

**Status:** FROZEN  
**Authority:** Derived from `docs/architecture/ARCHITECTURE.md` and `MODULES.md`.

---

## 1. Centralized Platform & Runtime Constraints
All tasks indexed in this registry inherit the following mandatory architectural constraints:

- **PLATFORM:** Chrome Extension — Manifest V3 (MV3)
- **PRIMARY TARGET:** Google Chrome (Desktop)
- **PRIMARY RUNTIME:** Browser-side VEIL extension runtime (Service Worker, Offscreen Document, or Popup) unless a task explicitly specifies that the component is a remote cloud service (e.g., cloud LLM backend for T012).
- **NON-REPLACEMENT RULE:** Every implementation task must be implemented within the VEIL Chrome Extension architecture. A standalone web application is **NOT** an acceptable replacement for any assigned browser-runtime capability.

---

## 2. Active Tasks (DAG)

| TASK ID | TASK NAME | OWNER | MODULE | DEPENDENCIES | STATE |
|---|---|---|---|---|---|
| [T001](docs/tasks/T001.md) | Implement Extension Shell | AI001 | M01 | None | VALIDATED |
| [T002](docs/tasks/T002.md) | Implement Orchestrator State Machine | AI001 | M01 | T001 | VALIDATED |
| [T003](docs/tasks/T003.md) | Implement Screenshot Capture | AI002 | M02 | T001 | READY |
| [T004](docs/tasks/T004.md) | Implement DOM/A11y Capture | AI002 | M02 | T001 | READY |
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

## 3. Execution Rules
1. Only tasks with `STATE = READY` may be executed.
2. An assigned task that is `BLOCKED` must not be started.
3. Every task must be implemented strictly within its assigned module's allowed file paths.
4. No task may alter architecture or interface contracts without an approved ADR.
