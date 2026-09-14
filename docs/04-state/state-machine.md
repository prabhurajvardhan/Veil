# Agent State Machine

## Conceptual States (PROPOSED, from brief example)

```
IDLE
→ UNDERSTANDING_TASK
→ OBSERVING
→ PERCEIVING
→ FUSING_EVIDENCE
→ CHECKING_PRIVACY
→ SANITIZING
→ READY_FOR_REASONING
→ REASONING
→ VALIDATING_ACTION
→ EXECUTING
→ VERIFYING
→ COMPLETE
```

## Failure States and Recovery
UNKNOWN — not enumerated in the brief beyond the acceptance-test scenarios in `10-quality/acceptance-tests.md` (e.g., model/runtime unavailable, browser action failure, invalid action proposal). PROPOSED: each of the ten acceptance scenarios should map to an explicit failure state with defined recovery/exit behavior; this mapping does not exist yet. VALIDATION REQUIRED.

## Transitions Requiring Special Care
- CHECKING_PRIVACY → SANITIZING must fail closed on uncertainty (loop should not silently skip to READY_FOR_REASONING).
- VALIDATING_ACTION → EXECUTING must not proceed on a stale or invalid proposal (see `02-system-design/execution/action-validation.md`).
- EXECUTING → VERIFYING is mandatory; there is no direct EXECUTING → COMPLETE transition, since the loop requires re-observation and verification.

## Open Questions
- UNKNOWN: exact recovery paths back to OBSERVING/REASONING on failure vs. terminal failure.
