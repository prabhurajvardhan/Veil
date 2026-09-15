# VEIL — Operational Status Board

This is the high-level control board for VEIL. It tracks global lifecycle stages, active milestones, and high-level blockers.
*For granular task state, see [TASKS.md](TASKS.md).*

## 1. Lifecycle Stage
**CURRENT STAGE:** Task Decomposition & Employee Allocation.
*Implementation is locked until task decomposition is complete.*

| Stage | Status | Document |
|---|---|---|
| Requirements | FROZEN | `docs/freezes/REQUIREMENTS.md` |
| Architecture | FROZEN | `docs/architecture/ARCHITECTURE.md` |
| System Design | FROZEN | `docs/system-design/SYSTEM-DESIGN.md` |
| Module Classification | FROZEN | `MODULES.md` |
| Interface Definition | FROZEN | `INTERFACES.md` |
| Task Decomposition | IN_PROGRESS | `TASKS.md` |
| Employee Allocation | IN_PROGRESS | `docs/employees/` |
| Implementation | BLOCKED | `src/` |

## 2. Integration Milestones State
*See [docs/integration/MILESTONES.md](docs/integration/MILESTONES.md) for definitions.*

| Milestone | Target | Status | Blockers |
|---|---|---|---|
| M0: Extension Shell | M01 | PLANNED | T001 pending |
| M1: Observation | M01, M02 | BLOCKED | M0 not integrated |
| M2: Local Perception | M03, M04, M05, M06 | BLOCKED | M1 not integrated |
| M3: Privacy Boundary | M07, M08 | BLOCKED | M2 not integrated |
| M4: Remote Reasoning | M09 | BLOCKED | M3 not integrated |
| M5: Closed Loop | M10, M11 | BLOCKED | M4 not integrated |

## 3. Global Blockers & Escalations
- **Blocker 1:** Implementation phase cannot begin until tasks T001 through T010 are fully decomposed and assigned in `TASKS.md`.
