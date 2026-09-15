# VEIL — Task Registry

This is the authoritative index of all engineering tasks.
**Employees:** Find your assigned tasks here. If a task's STATE is `READY`, you may begin. Open the linked Task ID document for full implementation, boundary, and mandatory reference instructions.

## Task State Definitions
- `PLANNED`: Task identified but dependencies unknown.
- `ASSIGNED`: Owner allocated, but dependencies not met.
- `BLOCKED`: Technical/Design/Interface dependencies are pending.
- `READY`: All dependencies met. Owner is authorized to start implementation.
- `IN_PROGRESS`: Owner is actively writing code.
- `VALIDATED`: Code is complete, tests pass locally. Ready for handoff.
- `INTEGRATION_READY`: PR opened and reviewed.
- `INTEGRATED`: Merged to mainline.
- `VERIFIED`: Confirmed working in the target Milestone.

## Active Tasks

| TASK ID | TASK NAME | OWNER | MODULE | DEPENDENCIES | STATE |
|---|---|---|---|---|---|
| [T001](docs/tasks/T001.md) | Initialize Extension Shell | AI001 | M01 | None | READY |
| [T002](docs/tasks/T002.md) | Implement Observation Capture | AI002 | M02 | T001 | BLOCKED |
| *T003* | *(Pending Decomposition)* | AI003 | M03 | T002 | PLANNED |
| *T004* | *(Pending Decomposition)* | AI004 | M04 | T002 | PLANNED |
| *T005* | *(Pending Decomposition)* | AI005 | M06 | T003, T004 | PLANNED |
| *T006* | *(Pending Decomposition)* | AI006 | M07 | T005 | PLANNED |
| *T007* | *(Pending Decomposition)* | AI007 | M08 | T006 | PLANNED |
| *T008* | *(Pending Decomposition)* | AI008 | M09 | T007 | PLANNED |
| *T009* | *(Pending Decomposition)* | AI009 | M10 | T008 | PLANNED |
| *T010* | *(Pending Decomposition)* | AI010 | M11 | T009 | PLANNED |

*(Tasks T003-T010 must be formally decomposed using `docs/tasks/TEMPLATE.md` before implementation begins).*
