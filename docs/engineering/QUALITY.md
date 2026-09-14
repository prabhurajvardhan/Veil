# VEIL — Quality, Testing & Standards

Status: DRAFT. Test categories CONFIRMED from brief; plans/framework [UNKNOWN until implementation language chosen]. Privacy testing is the most critical category → `docs/privacy/PRIVACY-TESTING.md`.

## 1. Test Categories (CONFIRMED from brief)

Unit tests · Integration tests · End-to-end tests · Browser tests · Privacy tests · Failure tests · Regression tests

## 2. Mapping to the Ten Acceptance Scenarios (CONFIRMED scenario list)

| # | Scenario | Test category |
|---|---|---|
| 1 | Normal browser task | E2E |
| 2 | Sensitive information visible | Privacy |
| 3 | Password field visible | Privacy |
| 4 | PII visible | Privacy |
| 5 | Local perception uncertainty | Failure / perception |
| 6 | Cloud proposes invalid action | Failure / action-protocol |
| 7 | Page changes before execution | Failure / staleness |
| 8 | Model/runtime unavailable | Failure |
| 9 | Browser action failure | Failure |
| 10 | Re-observation after action | E2E / closed-loop |

## 3. Failure Matrix (DRAFT)

| Failure | Detection | Response | Privacy impact | Recovery |
|---|---|---|---|---|
| Local perception uncertainty | Low confidence | Mark UNKNOWN; never guess | None (fail closed, expose nothing extra) | [UNKNOWN] |
| Cloud proposes invalid action | Guard rejects | Action not executed | None (rejected before execution) | [UNKNOWN] |
| Page changes before execution | Staleness check | Re-observe / re-validate | None if caught | [UNKNOWN] |
| Model/runtime unavailable | Network/timeout error | Clear failure state; no stale/guessed action | None (no data sent) | [UNKNOWN] |
| Browser action failure | Execution error | Mark failure | None expected | [UNKNOWN] |
| Privacy detection uncertain | Below threshold (threshold: UNKNOWN) | Fail closed, no transmission | Protected by design | [UNKNOWN] |

All [UNKNOWN] cells require dedicated design/validation work; do not fill with invented specifics.

## 4. Performance Testing (no invented numbers)

Categories [PROPOSED]: local perception latency (ShowUI-2B inference time); end-to-end loop latency (task → verified result); resource usage during local inference.
Concrete thresholds: [VALIDATION REQUIRED] — defined once V1 is functionally working and can be measured. No number is reported until measured.

## 5. Coding Standards (privacy-critical requirements, language-agnostic)

- Never log or persist raw pre-sanitization sensitive data.
- Any code path that could transmit data across the network boundary must be traceable to having passed through privacy-engine verification.
- Treat privacy-detection uncertainty as a fail-closed branch, not a swallowed exception.
- Any change touching the privacy engine or the network-boundary crossing requires an accompanying privacy test.
- [UNKNOWN] Language-level standards (naming, formatting, typing) — pending language choice (see `MODULES.md`).

## 6. Integration Strategy

[UNKNOWN] No integration pipeline/process defined. [PROPOSED] Integration must validate the module dependency chain end-to-end, not just pairwise (`docs/architecture/DEPENDENCIES.md`).

## 7. Test Result Policy

No pass/fail is ever recorded without an actually-run test. Evidence columns live in `docs/engineering/TRACEABILITY.md` and status in `STATUS.md`. Do not fabricate results.