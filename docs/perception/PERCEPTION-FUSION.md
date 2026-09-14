# VEIL — Perception Fusion

Status: DRAFT (PROPOSED). See also `LOCAL-PERCEPTION.md` (inputs) and `SHOWUI.md` (visual model).

## 1. Purpose

Combine local visual grounding (ShowUI-2B output) with DOM/A11y structural evidence (and optional OCR) into one coherent, structured perception result.

## 2. Inputs

- Visual grounding result (M03).
- DOM/A11y tree snapshot / structural evidence (M02).
- Optional OCR output (M04, conditional).

## 3. Outputs

A single fused perception result: structured elements with type, location, semantic label, confidence, and provenance.

## 4. Interfaces

[UNKNOWN — concrete schema not yet defined. PROPOSED draft in `INTERFACES.md` (IF-FUSION).]

## 5. Processing Principles (PROPOSED)

- Fuse sources with per-element confidence and provenance.
- Preserve three-state truthfulness: OBSERVED / NOT OBSERVED / UNKNOWN — never collapse UNKNOWN (PRIV-006).
- The fused result is the direct input to privacy detection; information lost or mislabeled here can cause a downstream privacy miss. Fusion must not silently drop evidence about potentially sensitive regions.

## 6. Failure Modes (PROPOSED)

- Conflicting evidence between visual and DOM sources → mark affected element(s) as low-confidence/UNKNOWN rather than arbitrarily picking one source.
- No evidence for a region the task references → surface as UNKNOWN, not as "element does not exist."
- Insufficient confidence → propagate as UNKNOWN to the state machine, not as success/failure.

## 7. Security Implications

The fused result is the direct input to the privacy engine. Any element dropped or mislabeled here can hide sensitive content from detection. Fusion must be conservative about dropping regions.

## 8. Implementation Notes

No implementation exists yet.

## 9. Open Questions

- [UNKNOWN] Exact fusion algorithm/heuristics.
- [UNKNOWN] How conflicting confidence scores are reconciled.
- [VALIDATION REQUIRED] Whether trusted-OCR is needed for baseline V1.

## 10. Interfaces (concept)

| Contract | Producer | Consumer |
|---|---|---|
| `VisualGroundingResult` | M03 | M04 |
| `StructuralEvidence` | M02 | M04 |
| `FusedPerception` | M04 | M05 |
| `SensitivityClassification` | M05 | — (internal to privacy engine) |