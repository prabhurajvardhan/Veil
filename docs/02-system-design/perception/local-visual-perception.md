# Local Visual Perception

## Screenshot Acquisition
PROPOSED: Triggered by the state machine's OBSERVING state; captures the current visible viewport (and possibly full page — UNKNOWN) as a raster image, entirely on-device.

## ShowUI
CONFIRMED: ShowUI-2B is the primary local visual grounding model. See `03-concepts/showui.md` for its role and boundaries. Do not invent unsupported performance numbers for it.

## Visual Grounding
PROPOSED: ShowUI-2B's output is expected to identify UI elements and their approximate screen locations/semantics, usable as evidence in perception fusion.

## DOM/A11y Evidence
PROPOSED: In parallel with visual grounding, the browser's DOM and/or accessibility tree is captured as structural evidence — element roles, text content, interactability.

## OCR When Necessary
PROPOSED, conditional: When visual grounding + DOM/A11y evidence together are insufficient to identify on-screen text (e.g., text rendered inside a canvas/image), OCR may be invoked as a fallback. Not required for baseline V1 unless a concrete gap is found.

## Confidence
PROPOSED: Each perception result should carry a confidence score/level; low confidence should propagate to the state machine as UNKNOWN rather than being treated as success or failure.

## Provenance
PROPOSED: Each fused evidence item should record which source(s) contributed to it (visual / DOM / OCR) to support debugging and privacy-detection design.

## Observation Freshness
PROPOSED: Every observation carries a timestamp/identifier so downstream validation can detect staleness (see `04-state/observation-state.md`, `02-system-design/execution/action-validation.md`).

## Evidence Fusion
See `perception-fusion.md`.

## Unknown State
CONFIRMED principle: when perception cannot establish a fact with sufficient confidence, the correct representation is UNKNOWN — never coerced to a false negative ("not observed") or a false positive.
