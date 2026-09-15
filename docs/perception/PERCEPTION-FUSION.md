# VEIL — Perception Fusion

Status: DRAFT (PROPOSED). Handled by M06.

## 1. Concept
Perception Fusion combines available evidence (Visual + DOM/A11y + OCR + Task Context) into a unified, structured `PerceptionResult`.

## 2. Fusion Responsibilities
- Correlate bounding boxes from visual models with DOM node coordinates.
- Reconcile semantic labels (e.g., visual text vs. ARIA labels).
- Track provenance (which source provided which piece of evidence).
- Calculate confidence scores.

## 3. Explicit Uncertainty
M06 must adhere to the semantic rule:
**NOT OBSERVED ≠ DOES NOT EXIST.**

The fusion engine must explicitly categorize state into three buckets:
1. **OBSERVED:** High confidence evidence confirms the state.
2. **NOT OBSERVED:** High confidence evidence confirms the state is absent.
3. **UNKNOWN:** Evidence is conflicting, missing, or model confidence is too low.

This explicit uncertainty is critical because M07 (Privacy Engine) must fail-closed on UNKNOWN regions.
