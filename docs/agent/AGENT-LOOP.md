# VEIL — Agent Loop

Status: DRAFT (PROPOSED). The loop structure is CONFIRMED from the brief; mechanism details are PROPOSED/UNKNOWN until system design freeze.

## 1. The Loop (CONFIRMED shape)

```
OBSERVE → UNDERSTAND → PROTECT → REASON → VALIDATE → ACT → OBSERVE → VERIFY
```

Mapping to pipeline stages:

| Loop step | System-design stage(s) | Modules |
|---|---|---|
| OBSERVE | 1–3 (capture screenshot + DOM/A11y) | M02 |
| UNDERSTAND | 4–5 (local perception + fusion) | M03, M04 |
| PROTECT | 6–9 (detection, sanitization, verification, context) | M05, M06 |
| REASON | 10–12 (transport, cloud reasoning, proposal parsing) | M07 |
| VALIDATE | 13 (local action validation) | M08 |
| ACT | 14 (browser execution) | M09 |
| OBSERVE | 15 (re-observation) | M02 |
| VERIFY | 16 (completion verification) | M10 |

## 2. When Observation Occurs

- At task start (first observation).
- After every executed action (re-observation is mandatory — no direct ACT → COMPLETE; CONFIRMED by state machine rule).
- On recovery from a failure that requires fresh page state [PROPOSED].

## 3. What Constitutes an Observation

A timestamped snapshot combining a screenshot reference (local-only) and a DOM/accessibility-tree snapshot, carrying an observation ID and freshness. Represented by the raw observation → later transformed. (Observation model from former `02-system-design/perception/observation-model.md`; fields PROPOSED.)

## 4. How Perception Works

Local visual grounding (ShowUI-2B) over the screenshot, fused with DOM/A11y structural evidence into a structured fusion result with per-element confidence and provenance. Details: `docs/perception/LOCAL-PERCEPTION.md`, `docs/perception/PERCEPTION-FUSION.md`.

## 5. When Privacy Runs

- After fusion, before any network transmission (PRIV-002 — always before the network boundary).
- Privacy detection → sanitization → redaction verification, then sanitized-context build.
- On uncertainty: fail closed (PRIV-007); UNKNOWN stays UNKNOWN (PRIV-006).
- Details: `docs/privacy/PRIVACY-BOUNDARY.md`, `docs/system-design/SYSTEM-DESIGN.md` Stages 6–9.

## 6. What Reasoning Receives

Only the sanitized context — structured, field-level, post-verification. No raw pixels, no raw DOM, no raw OCR. [CONFIRMED by PRIV-002/003, ADR-008]

## 7. How Actions Are Proposed

The cloud reasoning model receives sanitized context and returns a model response; local parsing converts it into a structured `ActionProposal` (per ADR-007 — structured, not free-form prose). Details: `docs/agent/ACTION-PROTOCOL.md`, Stage 12.

## 8. How Actions Are Validated

The local action guard checks schema validity, staleness of the referenced observation, and authorization of the action type/target in the current state (PRIV-005). Rejection is the required behavior for any failed check. Details: `docs/agent/ACTION-PROTOCOL.md`, Stage 13.

## 9. How Execution Occurs

Only validated actions reach the browser executor; the executor re-checks target/page state immediately before acting (narrowing the stale window) [PROPOSED], then executes via extension APIs. Details: Stage 14.

## 10. How Stale Observations Are Detected

[UNKNOWN] mechanism not yet designed. PROPOSED direction: observation IDs + timestamps + a state fingerprint (e.g., state hash) compared at validation time. See `docs/agent/STATE-MACHINE.md` and open design items in `docs/system-design/SYSTEM-DESIGN.md`.

## 11. How Success Is Verified

After execution, a fresh observation is taken; the agent compares observed state against the expected post-action state to decide success/failure/continue. Verification uses sanitized context only. Details: Stage 16.

## 12. How Failure Recovers

Recovery paths are [PROPOSED], tied to the state machine and the acceptance-test failure scenarios (5–9):
- Perception uncertainty → surface as UNKNOWN; do not guess.
- Invalid action proposal → reject; if repeated, block or escalate.
- Stale page → re-observe and re-validate.
- Model/runtime unavailable → clear failure state; never proceed with stale/guessed action.
- Browser action failure → mark failure; recovery path defined by state machine.

## 13. Invariants

- The cloud never receives raw data and never holds execution authority.
- Every action that changes the browser is validated locally first.
- Every execution is followed by re-observation and verification.
- UNKNOWN is never coerced to NOT OBSERVED or FALSE.