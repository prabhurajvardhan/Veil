# VEIL — Task Registry

This is the authoritative index of all engineering tasks.

## Task State Definitions
- `PLANNED`: Task identified but dependencies unknown.
- `ASSIGNED`: Owner allocated, but dependencies not met.
- `BLOCKED`: Technical/Design/Interface dependencies are pending.
- `READY`: All dependencies met. Owner is authorized to start implementation.
- `IN_PROGRESS`: Owner is actively writing code.
- `IMPLEMENTED`: Code written, local tests pending.
- `VALIDATED`: Code is complete, tests pass locally. Ready for handoff.
- `INTEGRATION_READY`: PR opened and reviewed.
- `INTEGRATED`: Merged to mainline.
- `VERIFIED`: Confirmed working in the target Milestone.

## Active Tasks (DAG)

| TASK ID | TASK NAME | OWNER | MODULE | DEPENDENCIES | TYPE | STATE |
|---|---|---|---|---|---|---|
| [T001](docs/tasks/T001.md) | Implement Extension Shell | AI001 | M01 | None | N/A | READY |
| [T002](docs/tasks/T002.md) | Implement Orchestrator State Machine | AI001 | M01 | T001 | TECHNICAL | BLOCKED |
| [T003](docs/tasks/T003.md) | Implement Screenshot Capture | AI002 | M02 | T001 | TECHNICAL | BLOCKED |
| [T004](docs/tasks/T004.md) | Implement DOM/A11y Capture | AI002 | M02 | T001 | TECHNICAL | BLOCKED |
| [T005](docs/tasks/T005.md) | Implement Visual Grounding Adapter | AI003 | M03 | T003 | TECHNICAL | BLOCKED |
| [T006](docs/tasks/T006.md) | Implement DOM Evidence Extraction | AI004 | M04 | T004 | TECHNICAL | BLOCKED |
| [T007](docs/tasks/T007.md) | Implement OCR Extraction | AI004 | M05 | T003 | TECHNICAL | BLOCKED |
| [T008](docs/tasks/T008.md) | Implement Perception Fusion Logic | AI005 | M06 | T005, T006, T007 | TECHNICAL | BLOCKED |
| [T009](docs/tasks/T009.md) | Implement Conflict Resolution & Confidence | AI005 | M06 | T008 | TECHNICAL | BLOCKED |
| [T010](docs/tasks/T010.md) | Implement Privacy Classification Rules | AI006 | M07 | T009 | TECHNICAL | BLOCKED |
| [T011](docs/tasks/T011.md) | Implement Visual Masking & DOM Redaction | AI007 | M08 | T010 | TECHNICAL | BLOCKED |
| [T012](docs/tasks/T012.md) | Implement Remote Reasoner Network Client | AI008 | M09 | T011 | TECHNICAL | BLOCKED |
| [T013](docs/tasks/T013.md) | Implement Local Action Guard (Staleness & Validation) | AI009 | M10 | T012, T002 | TECHNICAL | BLOCKED |
| [T014](docs/tasks/T014.md) | Implement Browser Execution Adapter | AI010 | M11 | T013 | TECHNICAL | BLOCKED |
| [T015](docs/tasks/T015.md) | Implement E2E Verification Loop | AI001 | M01 | T014 | TECHNICAL | BLOCKED |

