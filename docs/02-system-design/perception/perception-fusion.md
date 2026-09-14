# Perception Fusion

## Purpose
Combine local visual grounding (ShowUI-2B output) with DOM/A11y structural evidence (and optional OCR) into one coherent, structured perception result.

## Inputs
- Visual grounding result (from ShowUI-2B).
- DOM/A11y tree snapshot.
- Optional OCR output.

## Outputs
- A single fused perception result: structured elements with type, location, semantic label, confidence, and provenance.

## Interfaces
UNKNOWN — concrete schema not yet defined. See `05-engineering/interface-contracts.md` (draft).

## Failure Modes
- PROPOSED: conflicting evidence between visual and DOM sources → mark affected element(s) as low-confidence/UNKNOWN rather than arbitrarily picking one source.
- PROPOSED: no evidence for a region the task references → surface as UNKNOWN, not as "element does not exist."

## Security Implications
The fused result is the direct input to privacy detection; any information lost or mislabeled here can cause a downstream privacy miss. Fusion must not silently drop evidence about potentially sensitive regions.

## Implementation Notes
PROPOSED only; no implementation exists yet.

## Open Questions
- UNKNOWN: exact fusion algorithm/heuristics.
- UNKNOWN: how conflicting confidence scores are reconciled.
