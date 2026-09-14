# VEIL — Agent State Machine

Status: DRAFT (PROPOSED states; validated against implementation only when one exists). See former `04-state/state-machine.md` for lineage.

## 1. States (PROPOSED)

```
IDLE
→ TASK_RECEIVED
→ OBSERVING
→ PERCEIVING
→ FUSING
→ PRIVACY_CHECK
→ SANITIZING
→ READY_FOR_REASONING
→ REASONING
→ ACTION_VALIDATION
→ EXECUTING
→ VERIFYING
→ COMPLETED | FAILED | RECOVERY
```

## 2. Transitions

| From | To | Trigger | Guard |
|---|---|---|---|
| IDLE | TASK_RECEIVED | User task accepted | Task parsed |
| TASK_RECEIVED | OBSERVING | Observation request | — |
| OBSERVING | PERCEIVING | Raw observation captured | Capture succeeded |
| PERCEIVING | FUSING | Visual grounding complete | Inference succeeded |
| FUSING | PRIVACY_CHECK | Fused result ready | Fusion produced result (may contain UNKNOWN regions) |
| PRIVACY_CHECK | SANITIZING | Sensitivity classification done | Uncertain regions classified as sensitive (fail closed) |
| SANITIZING | READY_FOR_REASONING | Sanitization + redaction verification clean | Verification confirmed clean |
| SANITIZING | FAILED | Verification cannot confirm clean | Fail-closed gate 2 |
| READY_FOR_REASONING | REASONING | Sanitized context transmitted | — |
| REASONING | ACTION_VALIDATION | Action proposal received | Proposal parsed |
| ACTION_VALIDATION | EXECUTING | Proposal validated | Schema, staleness, authorization all pass |
| ACTION_VALIDATION | OBSERVING | Proposal stale | Staleness check failed → re-observe |
| ACTION_VALIDATION | FAILED | Proposal invalid/unauthorized (repeated) | Policy [UNKNOWN — VALIDATION REQUIRED] |
| EXECUTING | VERIFYING | Action executed | Execution completed (success or failure result) |
| VERIFYING | COMPLETED | Task verified complete | Success confirmed |
| VERIFYING | OBSERVING | Task not complete | Continue loop |
| VERIFYING | FAILED | Task cannot be completed | Terminal failure |
| FAILED | RECOVERY | Recovery action taken | Recovery policy allows |
| RECOVERY | OBSERVING | Fresh observation needed | [PROPOSED] |
| RECOVERY | COMPLETED | Recovery resolved task | [PROPOSED] |
| (any active state) | FAILED | Model/unavailable/inference failure | Accepted failure condition |

## 3. Guards Requiring Special Care (CONFIRMED state-machine rules from brief-derived principles)

- `PRIVACY_CHECK → SANITIZING` must fail closed on uncertainty; the loop must not silently skip to `READY_FOR_REASONING`.
- `ACTION_VALIDATION → EXECUTING` must not proceed on a stale or invalid proposal.
- `EXECUTING → VERIFYING` is mandatory; there is no direct `EXECUTING → COMPLETED` transition.

## 4. Outputs

Each transition emits stage outputs (raw observation, fused perception, sanitized context, action proposal, validated action, execution result, verification result) consumed by the corresponding module via `INTERFACES.md`.

## 5. Failure Transitions

- Perception failure → FAILED (no fabricated perception; PRIV-008, scenario 15).
- Privacy uncertainty → fail closed → SANITIZING treats as sensitive, or FAILED if verification fails.
- Proposal invalid/stale/unauthorized → rejection; stale triggers re-observation; repeated invalid proposals escalate per policy [UNKNOWN].
- Model/runtime unavailable → FAILED with a clear state (never proceed on stale/guessed action).
- Browser action failure → execution result failure → VERIFYING → FAILED or RECOVERY per policy.

## 6. Recovery

[PROPOSED] RECOVERY re-enters the loop at OBSERVING with prior task state preserved (minus any raw data, which never persists in a transmittable form — CONFIRMED constraint from `04-state/agent-state.md` lineage).
Exact recovery paths and policy: [UNKNOWN — VALIDATION REQUIRED].

## 7. Agent Task State (fields, PROPOSED)

- current task description
- current state-machine state
- most recent observation reference (ID/timestamp/freshness)
- iteration count
- accumulated task-relevant context derived from sanitized observations only (never raw)

Constraints: no raw pre-sanitization sensitive data in persistent agent state that could later be transmitted [CONFIRMED]. Task-state retention across tasks [UNKNOWN].