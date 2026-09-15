# VEIL — Local Perception Design

Status: DRAFT (PROPOSED). VEIL extracts understanding from the browser entirely locally before privacy sanitization.

## 1. Perception Flow
```text
Browser Observation (M02)
        ↓
Visual Evidence (M03 ShowUI)  +  DOM/A11y Evidence (M04)  +  Optional OCR (M05)
        ↓
Perception Fusion (M06)
        ↓
Structured PerceptionResult
```

## 2. Perception Sufficiency
The remote reasoner should not receive an observation simply because *some* perception result exists. VEIL determines if enough trustworthy evidence exists for the current task.
- If required evidence is UNKNOWN, M01 Orchestrator must not allow the remote reasoner to silently infer it as fact.
- Instead, VEIL may request another observation, scroll to a different region, or prompt the user.
- **LOW COMPUTE / LOW CONFIDENCE MUST REDUCE CAPABILITY, NOT REDUCE PRIVACY.**

## 3. Handling Perception Failures
- **Insufficient Visual Evidence:** Rely on DOM/A11y.
- **Missing DOM Information:** Rely on Visual Evidence + OCR (e.g., for Canvas elements).
- **Conflicting Evidence:** If visual says a button is "Cancel" but DOM says "Submit", M06 marks the element with low confidence / UNKNOWN.
- **Model Failure (OOM/Timeout):** Mark visual evidence as absent. Do not leak raw pixels to cloud as a fallback.

## 4. Semantic Rule: Uncertainty
**NOT OBSERVED ≠ DOES NOT EXIST.**
Explicit uncertainty must be encoded in the `PerceptionResult`.
