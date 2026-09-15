# VEIL — Agent State Machine

Status: DRAFT (PROPOSED). Conceptual state model managed by M01 (Browser Agent Core / Orchestrator).

## 1. Core States
```text
IDLE
 ↓
TASK_RECEIVED
 ↓
OBSERVING
 ↓
PERCEIVING
 ↓
FUSING
 ↓
PRIVACY_CHECK
 ↓
SANITIZING
 ↓
READY_FOR_REASONING
 ↓
REASONING
 ↓
ACTION_VALIDATION
 ↓
EXECUTING
 ↓
VERIFYING
 ↓
COMPLETED
```

## 2. Failure and Recovery Transitions
Failures must be explicitly handled. Arbitrary states are not invented; recovery paths are logical loops.

- **PERCEIVING → RECOVERY**: If local models crash, OOM, or timeout. Degrades capability.
- **PRIVACY_CHECK → RECOVERY**: If privacy rules error out. Fails closed.
- **ACTION_VALIDATION → RECOVERY**: If the remote model proposes a stale, unauthorized, or malformed action.
- **EXECUTING → RECOVERY**: If the browser API fails to execute the action (element detached, navigation blocked).
- **VERIFYING → OBSERVING**: If the action succeeded, loop back to observe the next state. If the action failed to produce the intended effect, loop back to observe and re-plan.
- **RECOVERY → OBSERVING**: Attempt to take a fresh observation and retry.
- **RECOVERY → FAILED**: If retry limits are reached or a hard privacy block occurs, terminate the task.
