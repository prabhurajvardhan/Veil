# VEIL — ShowUI-2B

Status: CONFIRMED as implementation choice; integration details PROPOSED/UNKNOWN.

## 1. What ShowUI-2B Is

**CONFIRMED (from brief):** ShowUI-2B is VEIL's primary local visual grounding model, run on-device. It is the implementation of the architectural requirement **LOCAL VISUAL GROUNDING**.

> **Important:** ShowUI-2B is an *implementation decision*, not the fundamental architectural requirement. The architectural requirement is that visual grounding happens locally. ShowUI-2B is the chosen implementation and can be replaced only through the project decision process (see ADR-010 in `DECISIONS.md`) if validation shows another implementation is better.

## 2. Role in VEIL

Sits inside the "Local Visual Understanding" stage of the loop, feeding perception fusion alongside DOM/A11y evidence.

## 3. What VEIL Expects From It (PROPOSED)

- Element-level visual grounding output (what elements exist, roughly where they are, semantic labels).
- Usable as one evidence source in perception fusion.
- Exact output schema: [UNKNOWN].

## 4. What It Does NOT Control (CONFIRMED by architectural separation)

- Does not make privacy decisions (that is the privacy engine's job).
- Does not decide reasoning/actions (cloud reasoning proposes; local guard validates).
- Does not execute anything (executor executes).

## 5. Inputs / Outputs

- **Input:** raw screenshot (local only).
- **Output:** visual grounding result → perception fusion.
- **Interfaces:** [UNKNOWN — PROPOSED schema in `INTERFACES.md`].

## 6. Constraints (CONFIRMED)

"Do NOT redesign the project around a different model unless there is a concrete technical blocker." (from brief)

## 7. Failure Modes

- Model failure/timeout: [UNKNOWN — VALIDATION REQUIRED].
- Hardware/runtime requirements to run it locally: [UNKNOWN — do not fabricate RAM/latency figures].

## 8. Security / Privacy Implications

- Runs entirely within the local runtime boundary.
- Its raw input (the screenshot) must never cross the network boundary (ADR-008).
- Its output is still unsanitized until the privacy engine runs.

## 9. Open Questions

- [UNKNOWN] Actual capabilities, accuracy, and resource requirements on target hardware — requires direct testing; do not fabricate.
- [VALIDATION REQUIRED] On-device performance within an acceptable latency budget (budget itself: [UNKNOWN]).