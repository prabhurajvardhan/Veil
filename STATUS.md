# VEIL — Operational Status Board

This is the high-level control board for VEIL. It tracks global lifecycle stages, active milestones, and high-level blockers.
*For granular task state, see [TASKS.md](TASKS.md).*

## 1. Platform Architecture
- **PRIMARY PRODUCT RUNTIME:** Chrome Extension (Manifest V3) targeting Google Chrome
- **AUXILIARY TOOLS:** React architecture viewer (supporting development interface only)

## 2. Lifecycle Stage
**CURRENT STAGE:** Ready for Implementation (T001 Extension Shell).

| Stage | Status | Document |
|---|---|---|
| Requirements | FROZEN | `docs/requirements/REQUIREMENTS.md` |
| Architecture | FROZEN | `docs/architecture/ARCHITECTURE.md` |
| System Design | FROZEN | `docs/system-design/SYSTEM-DESIGN.md` |
| Module Classification | FROZEN | `MODULES.md` |
| Interface Definition | FROZEN | `INTERFACES.md` |
| Task Decomposition | FROZEN | `TASKS.md` (T001-T015 decomposed) |
| Employee Allocation | FROZEN | `docs/employees/` (AI001-AI010 allocated) |
| Implementation | READY (T001) | `/src/m01-core/` |

## 3. Integration Milestones State
*See [INTEGRATION.md](INTEGRATION.md) for definitions.*

| Milestone | Target | Status | Blockers |
|---|---|---|---|
| M0: Extension Shell | M01 | READY | None (T001 is READY) |
| M1: Observation | M01, M02 | BLOCKED | M0 not integrated |
| M2: Local Perception | M03, M04, M05, M06 | BLOCKED | M1 not integrated |
| M3: Privacy Boundary | M07, M08 | BLOCKED | M2 not integrated |
| M4: Remote Reasoning | M09 | BLOCKED | M3 not integrated |
| M5: Closed Loop | M10, M11 | BLOCKED | M4 not integrated |

## 4. Global Blockers & Escalations
- **Active Blockers:** None for T001. Task T001 is in `READY` status and unblocked. Downstream tasks (T002-T015) remain blocked pending their respective DAG dependencies.
