# VEIL — Integration Milestones

**Status:** NOT FROZEN — V0 draft. No freeze ledger record exists; per ADR 008 in `DECISIONS.md` integration milestones are not frozen.
## Milestone 0 (M0) — Executable Extension Foundation
- **Entry Conditions:** Core interfaces defined. **Architecture frozen** — per the `docs/freezes/` ledger (ADR 008). **NOT currently met.** All stages are unfrozen, so M0 may not begin.
- **Tasks Required:** T001, T002.
- **Modules Involved:** M01.
- **Consumer:** M02 (T003, T004) consumes the M0 shell; see `docs/tasks/T001.md` §17.
- **Validation:** Extension loads in Chrome without errors. Background service worker registers successfully.
- **Status:** BLOCKED — entry conditions unmet.

## Milestone 1 (M1) — Browser Observation
- **Entry Conditions:** M0 verified.
- **Tasks Required:** T003, T004.
- **Modules Involved:** M02.
- **Validation:** Extension can successfully attach `chrome.debugger` to a tab and capture a `RawObservation`.

## Milestone 2 (M2) — Local Perception
- **Entry Conditions:** M1 verified.
- **Tasks Required:** T005, T006, T007, T008, T009.
- **Modules Involved:** M03, M04, M05, M06.
- **Validation:** Takes `RawObservation` and successfully outputs a unified `PerceptionResult` with bounding boxes mapped to target IDs.

## Milestone 3 (M3) — Privacy Boundary
- **Entry Conditions:** M2 verified.
- **Tasks Required:** T010, T011.
- **Modules Involved:** M07, M08.
- **Validation:** `SanitizedObservation` produces blacked-out base64 images and scrubbed text for `<input type="password">` elements.

## Milestone 4 (M4) — Remote Reasoning
- **Entry Conditions:** M3 verified.
- **Tasks Required:** T012.
- **Modules Involved:** M09.
- **Validation:** Service worker successfully transmits `SanitizedObservation` to backend and receives a valid `ActionProposal`.

## Milestone 5 (M5) — Closed Loop
- **Entry Conditions:** M4 verified.
- **Tasks Required:** T013, T014, T015.
- **Modules Involved:** M10, M11, M01.
- **Validation:** `ActionProposal` is validated, resolved, and correctly executed via CDP. The loop correctly returns to M01 for the next iteration.
