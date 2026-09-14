# VEIL — Local Perception

Status: DRAFT (PROPOSED). Defines how VEIL understands the page entirely on-device. See also `SHOWUI.md` (the model) and `PERCEPTION-FUSION.md` (the fusion).

## 1. Purpose

Interpret a raw observation (screenshot + DOM/A11y) locally so that no pixel data ever needs to leave the device to be understood.

## 2. Screenshot Acquisition (PROPOSED)

- Triggered by the state machine's `OBSERVING` state.
- Captures the visible viewport as a raster image; full-page capture: [UNKNOWN].
- Entirely on-device (M02).

## 3. Visual Grounding (ShowUI-2B)

- ShowUI-2B processes the screenshot entirely on-device (M03).
- Expected output: identification of UI elements and approximate screen locations/semantics usable as evidence in fusion.
- Exact output schema: [UNKNOWN].
- Do not invent unsupported performance numbers for it. See `SHOWUI.md`.

## 4. DOM/A11y Evidence (PROPOSED)

- In parallel with visual grounding, the browser's DOM/accessibility tree is captured as structural evidence: element roles, text content, interactability.
- This source is unsanitized until the privacy engine processes the fused result.

## 5. OCR When Necessary (PROPOSED, conditional)

- When visual grounding + DOM/A11y evidence together are insufficient to identify on-screen text (e.g., text rendered inside a canvas/image), OCR may be invoked as a fallback.
- Not required for baseline V1 unless a concrete gap is found.
- OCR output is local-only and unsanitized (never crosses the boundary).

## 6. Confidence (PROPOSED)

Each perception result should carry a confidence level; low confidence propagates to the state machine as UNKNOWN rather than being treated as success or failure.

## 7. Provenance (PROPOSED)

Each fused evidence item records which source(s) contributed (visual / DOM / OCR) to support debugging and privacy-detection design.

## 8. Observation Freshness (PROPOSED)

Every observation carries a timestamp/identifier so downstream validation can detect staleness (see `docs/agent/ACTION-PROTOCOL.md`, `docs/agent/STATE-MACHINE.md`).

## 9. Unknown State (CONFIRMED principle)

When perception cannot establish a fact with sufficient confidence, the correct representation is UNKNOWN — never coerced to a false negative ("not observed") or a false positive. (PRIV-006)

## 10. Failure Modes

- Capture failure (permission denied, page not ready): must produce an explicit failure observation, not silently empty [PROPOSED].
- Model failure/timeout: [UNKNOWN — VALIDATION REQUIRED].
- Confidence reconciliation between sources: [UNKNOWN] (see `PERCEPTION-FUSION.md`).

## 11. Interfaces

| Contract | Producer | Consumer |
|---|---|---|
| `RawObservation` | M02 | M03, M04 |
| `VisualGroundingResult` | M03 | M04 |
| `StructuralEvidence` | M02 | M04 |

Schemas: [PROPOSED drafts in `INTERFACES.md`]; final to be frozen at System Design Freeze.