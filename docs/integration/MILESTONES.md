# VEIL — Integration Milestones

Status: FROZEN. This document defines the progressive vertical integration of VEIL. VEIL is built via verifiable milestones, not a "big bang" final assembly. Every milestone must produce something visible, executable, or measurable.

## Milestone 0 (M0) — Executable Extension Foundation
- **Entry Conditions:** Architecture frozen. Core interfaces defined.
- **Tasks Required:** T001 (Extension Shell).
- **Modules Involved:** M01.
- **Integration Sequence:** Build minimal manifest, background service worker, and popup.
- **Visible Result:** Extension installs in Chrome and logs lifecycle events.
- **Acceptance Gate:** Extension loads without errors.

## Milestone 1 (M1) — Browser Observation
- **Entry Conditions:** M0 verified.
- **Tasks Required:** T002 (Screenshot Capture), T003 (DOM/A11y Capture).
- **Modules Involved:** M01, M02.
- **Integration Sequence:** M01 triggers M02. M02 captures screenshot and DOM.
- **Visible Result:** A debug view showing the raw screenshot and structural DOM tree extracted from the active tab.
- **Acceptance Gate:** Valid `RawObservation` payload produced on command.

## Milestone 2 (M2) — Local Perception
- **Entry Conditions:** M1 verified.
- **Modules Involved:** M02, M03 (ShowUI), M04 (DOM), M05 (OCR), M06 (Fusion).
- **Integration Sequence:** Pass `RawObservation` to local models, run inference, extract DOM coordinates, fuse into `PerceptionResult`.
- **Visible Result:** A debug overlay drawing bounding boxes and semantic labels over the captured screenshot.
- **Acceptance Gate:** `PerceptionResult` successfully differentiates `OBSERVED`, `NOT_OBSERVED`, and `UNKNOWN` states.

## Milestone 3 (M3) — The Privacy Boundary
- **Entry Conditions:** M2 verified.
- **Modules Involved:** M06, M07 (Privacy Engine), M08 (Sanitization).
- **Integration Sequence:** M07 classifies `PerceptionResult`. M08 redacts sensitive nodes and produces `SanitizedObservation`.
- **Visible Result:** A visual diff showing the raw screenshot vs. the sanitized DOM/visual regions (passwords masked, PII blurred).
- **Acceptance Gate:** No raw sensitive data passes M08. Fail-closed logic executes correctly on uncertainty.

## Milestone 4 (M4) — Sanitized Remote Reasoning
- **Entry Conditions:** M3 verified.
- **Modules Involved:** M08, M09 (Remote Reasoner).
- **Integration Sequence:** `SanitizedObservation` is transmitted to the cloud LLM. LLM returns an `ActionProposal`.
- **Visible Result:** A network log proving only sanitized data went outbound, and a structured action intent returned.
- **Acceptance Gate:** Remote reasoner successfully parses state and proposes a valid JSON schema action.

## Milestone 5 (M5) — Controlled Execution & Closed Loop
- **Entry Conditions:** M4 verified.
- **Modules Involved:** M09, M10 (Action Guard), M11 (Executor), M01, M02.
- **Integration Sequence:** M10 validates proposal against state hash. M11 executes. M01 triggers re-observation via M02.
- **Visible Result:** The browser automatically clicks/types in the live tab, followed by a new observation log.
- **Acceptance Gate:** Stale actions are rejected. Valid actions execute and trigger verification. E2E loop completes one full cycle.
