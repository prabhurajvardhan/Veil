# Acceptance Tests — V1

CONFIRMED minimum scenario list, verbatim from brief:

1. Normal browser task.
2. Sensitive information visible.
3. Password field visible.
4. PII visible.
5. Local perception uncertainty.
6. Cloud proposes invalid action.
7. Page changes before execution.
8. Model/runtime unavailable.
9. Browser action failure.
10. Re-observation after action.

## Status
Scenario list confirmed; concrete test steps, expected results, and pass/fail criteria are UNKNOWN and must be written once the system design schemas (`02-system-design/`) are no longer draft.

## Cross-References
Scenarios 2–4 correspond directly to `privacy-testing.md`'s required test areas. Scenarios 5–9 correspond to rows in `failure-matrix.md`. Scenario 10 validates the closed-loop principle in `03-concepts/observe-act-observe.md`.
