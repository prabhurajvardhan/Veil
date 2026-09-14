# VEIL — Project Status

Status rule: never claim a completion without evidence. Evidence lives in `docs/engineering/TRACEABILITY.md` (test/evidence columns) and PRs.

## Current Phase

Phase 1 — Requirements: **drafted, NOT frozen.** See `docs/engineering/WORKFLOW.md`.

## Current Freeze

**None.** Requirements, Architecture, System Design, and Modules are all NOT FROZEN. `docs/freezes/` records are all `NOT FROZEN`.

## Completed

- [x] Requirements drafted (REQ-001…REQ-019, PRIV-001…PRIV-008) — content from the project brief; not reviewed/signed off.
- [x] Architecture V0 drafted (components, boundaries, trust boundaries).
- [x] System design V0 drafted (16 stages, PROPOSED).
- [x] Module registry drafted (M01–M11, PROPOSED).
- [x] Privacy boundary + privacy testing scenarios defined.
- [x] Traceability matrix skeleton created (evidence columns empty).

## In Progress

- None (single-pass restructure; no implementation).

## Blocked

- Nothing is implementation-blocked yet; requirements freeze has not occurred.

## Next Actions

1. Team review of `docs/requirements/REQUIREMENTS.md`.
2. Requirements freeze (record in `docs/freezes/REQUIREMENTS.md`).
3. Architecture V0 → V1 review → … → Architecture freeze.
4. System design schemas (INTERFACES.md) finalized → System Design freeze.
5. Module boundaries confirmed → Module freeze.
6. Task planning in `TASKS.md`.
7. Employee allocation in `docs/employees/`.

## Validation Required

- [UNKNOWN] Concrete non-functional targets (latency, RAM/CPU, throughput, offline behavior).
- [UNKNOWN] Cloud reasoning model/provider.
- [UNKNOWN] Target Chrome version(s)/OS.
- [UNKNOWN] Staleness-detection mechanism.
- [UNKNOWN] Fusion algorithm and confidence reconciliation.
- [UNKNOWN] Sanitization per-type transformation rules.
- [UNKNOWN] Transport protocol.
- [VALIDATION REQUIRED] ShowUI-2B on-device performance/accuracy on target hardware.
- [VALIDATION REQUIRED] Extension permission model feasibility.

## Known Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Local inference (ShowUI-2B) performance unknown | V1 loop latency | Measure early; keep model swappable per ADR-010 |
| Sanitized context insufficient for reasoning | Task failure | V1 acceptance + payload-quality checks (ADR-008) |
| Privacy-detection misses | Core promise broken | Fail-closed + redaction-verification + payload inspection |
| No adversarial threat model | Security depth unclear | Document as UNKNOWN; define model with team |
| Prompt injection via page content | Disclosed data / unauthorized action | Sanitization + local validation; advanced defense FUTURE |

## Module Status

All M01–M11: **PLANNED** (no implementation). See `MODULES.md`.

## Task Status

**No tasks created yet.** Task creation follows Module Freeze (per lifecycle, `docs/engineering/WORKFLOW.md`). See `TASKS.md`.