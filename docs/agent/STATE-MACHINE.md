# VEIL — Canonical M01 Agent State Machine

**Status:** CANONICAL (single source of truth).
**Authority:** ADR 009 in `DECISIONS.md`. Owner: M01 (Browser Agent Core / Orchestrator).
**Implementing task:** T002. Integration milestone: M0.

> This document is the **only** definition of the M01 state machine. `MODULES.md` (M01), `docs/system-design/SYSTEM-DESIGN.md` (M01), `docs/tasks/T002.md`, `docs/tasks/T015.md`, and `docs/employees/AI001.md` reference this model and must not restate a competing definition.
>
> **Naming note:** M01 state names are an **internal orchestrator concern**. They are not part of any interface in `INTERFACES.md` and are never emitted to another module. Other modules receive M01's lifecycle triggers (`MODULES.md` M01 Outputs: "Lifecycle triggers for M02, M09, M10") and are unaware of M01 state names.

---

## 1. Model Structure

The canonical model is **module-oriented**: each stable state corresponds to exactly one inter-module hand-off, so that no state duplicates another module's internal lifecycle and no module boundary in `MODULES.md` is crossed.

```text
                          (User Task Goal)
                                 │
                                 ▼
   ┌─────┐   task accepted   ┌───────────┐   observation ready   ┌──────────────┐
   │IDLE │ ────────────────► │ OBSERVING │ ────────────────────► │ AUTHORIZING  │
   └─────┘                   └───────────┘                       └──────────────┘
      ▲                            ▲                                     │
      │                            │                            authorization complete
      │                            │                                     ▼
      │                            │                              ┌─────────────┐
      │                            │                              │  REASONING  │
      │                            │                              └─────────────┘
      │                            │                                     │
      │                            │                            ActionProposal received
      │                            │                                     ▼
      │                            │                              ┌─────────────┐
      │                            │                              │  EXECUTING  │
      │                            │                              └─────────────┘
      │                            │                                     │
      │                            │                           ExecutionResult received
      │                            │                                     ▼
      │                            │                              ┌─────────────┐
      │                            │                              │  VERIFYING  │
      │                            │                              └─────────────┘
      │                            │                                     │
      │                     goal not yet achieved                       │ goal achieved
      │                            └─────────────────────────────────────┤
      │                                                                  ▼
      │                                                           ┌───────────┐
      │                                                           │ COMPLETED │  (terminal)
      │                                                           └───────────┘
      │
      │                    ┌────────────┐
      └────────────────────┤  ABORTED   │  (terminal)
                           └────────────┘
                                 ▲
                                 │ retries exhausted / hard privacy block
                           ┌────────────┐
                    ┌─────►│  RECOVERY  │◄────── (from any active state)
                    │      └────────────┘
                    │            │
                    └────────────┘ fresh observation available → OBSERVING
```

`RECOVERY` is a transient state, not a terminal one. `COMPLETED` and `ABORTED` are terminal.

---

## 2. Canonical State Definitions

Every state below is fully specified against the ten required attributes: **State name · Purpose · Entry condition · Allowed inputs · Allowed transitions · Exit condition · Failure transitions · Recovery behaviour · Ownership · Observable evidence.**

**Ownership for every state:** M01 (Browser Agent Core / Orchestrator), executing in the Chrome Extension Service Worker context (`docs/system-design/SYSTEM-DESIGN.md` §2 M01). No other state owner exists.

### 2.1 `IDLE`
- **Purpose:** Rest state. No task is active; the orchestrator holds no observation, proposal, or execution context.
- **Entry condition:** Extension service worker starts, or a task reaches a terminal state (`COMPLETED`/`ABORTED`) and is acknowledged.
- **Allowed inputs:** A User Task Goal (initiated from the Extension Action Popup or Options page — `docs/system-design/SYSTEM-DESIGN.md` §2 M01 Input).
- **Allowed transitions:** `IDLE → OBSERVING` on acceptance of a User Task Goal with schema-valid, non-empty goal text.
- **Exit condition:** A User Task Goal is accepted and persisted as the active task.
- **Failure transitions:** None. An invalid/missing goal is rejected and the machine remains `IDLE`.
- **Recovery behaviour:** Not applicable; `IDLE` performs no work.
- **Observable evidence:** Lifecycle status readable by the popup showing "no active task".

### 2.2 `OBSERVING`
- **Purpose:** Obtain a fresh, current browser observation to reason over.
- **Entry condition:** Entry from `IDLE` (new task), from `VERIFYING` (goal not yet achieved), or from `RECOVERY` (fresh observation available).
- **Allowed inputs:** M01 observation trigger issued to **M02**; M02's `RawObservation` (`INTERFACES.md` §1) as completion signal.
- **Allowed transitions:** `OBSERVING → AUTHORIZING` on receipt of a well-formed `RawObservation` (required: `observation_id`, `timestamp`, screenshot, `dom_tree`, `a11y_tree`).
- **Exit condition:** A valid `RawObservation` has been received and recorded as the current observation.
- **Failure transitions:** `OBSERVING → RECOVERY` if M02 fails to return a `RawObservation` within the observation window, or returns a malformed record.
- **Recovery behaviour:** `RECOVERY` re-issues the observation trigger with a bounded retry count; exhaustion transitions to `ABORTED`.
- **Observable evidence:** Current `observation_id` and observation timestamp recorded in orchestrator state; the agent may surface "observing…" to the popup.

### 2.3 `AUTHORIZING`
- **Purpose:** Drive the local perception-and-protection pipeline (M03–M08) that must complete **before** anything may cross the network boundary. This is the state that enforces `docs/privacy/PRIVACY-BOUNDARY.md` §2–§3 and REQ-005/REQ-006.
- **Entry condition:** A valid `RawObservation` is the current observation.
- **Allowed inputs:** `RawObservation` from M02; the fused `PerceptionResult` (M06, `INTERFACES.md` §3); the `PrivacyAssessment` (M07, `INTERFACES.md` §4); the `SanitizedObservation` (M08, `INTERFACES.md` §4).
- **Allowed transitions:** `AUTHORIZING → REASONING` **only** on receipt of a `SanitizedObservation` whose `observation_id` matches the current observation.
- **Exit condition:** A `SanitizedObservation` exists locally and matches the current observation.
- **Failure transitions:** `AUTHORIZING → RECOVERY` when: perception yields no usable evidence; privacy classification cannot reach a decision and must fail closed (`DECISIONS.md` ADR 006, `docs/perception/PERCEPTION-FUSION.md` §3 `UNKNOWN`); sanitization errors (`docs/privacy/PRIVACY-TESTING.md` §10); or a node is classified `uncertain` (uncertainty = sensitive).
- **Recovery behaviour:** Fail **closed**. Raw or partially-sanitized data must never be forwarded. `RECOVERY` may re-observe; if the uncertainty is intrinsic to the page content, `RECOVERY → ABORTED` rather than degrade privacy (PRIV-008).
- **Observable evidence:** Presence of a `SanitizedObservation` for the current `observation_id`, and the `PrivacyAssessment.sensitive_target_ids` list. A blocked `AUTHORIZING` surfaces as a refusal, never a partial payload.
- **Boundary note:** M01 **orchestrates** this state and never inspects raw pixels, raw DOM text, model tensors, or the privacy policy itself. Those are M03–M08 internals (M01 "Does Not Own", `MODULES.md`).

### 2.4 `REASONING`
- **Purpose:** Obtain a declarative `ActionProposal` from the remote advisory reasoner (M09) for the current sanitized observation.
- **Entry condition:** A `SanitizedObservation` matching the current observation exists.
- **Allowed inputs:** `SanitizedObservation` and the User Task Goal handed to **M09**; the returned `ActionProposal` (`INTERFACES.md` §5).
- **Allowed transitions:** `REASONING → EXECUTING` on receipt of a schema-valid `ActionProposal` whose `observation_id` matches the current observation.
- **Exit condition:** A schema-valid `ActionProposal` is received.
- **Failure transitions:** `REASONING → RECOVERY` on network failure, timeout (M09: 15 s, 3 retries, `docs/system-design/SYSTEM-DESIGN.md` §2 M09), or a response that fails `ActionProposal` schema validation.

> **Implementation note (binding on T002/T015):** the **completed-goal exit** is M09 returning `action_type: 'DONE'`. `INTERFACES.md` §5 defines `DONE` as a member of `ActionType`, and no other completion channel is defined in `INTERFACES.md`. T002 must model the completion exit as a `DONE` proposal. This is a state-machine modelling consequence of the frozen interface, not a new interface.

- **Recovery behaviour:** `RECOVERY` may re-observe and re-issue the request (a stale proposal is not usable). No fallback to raw data is permitted. Repeated failure → `ABORTED`.
- **Observable evidence:** The received `ActionProposal` (`action_id`, `action_type`, `target_id?`, `intended_effect`).
- **Boundary note:** M01 treats the proposal as untrusted input (SEC-002) and never executes it.

### 2.5 `EXECUTING`
- **Purpose:** Have the locally validated action physically performed in the browser.
- **Entry condition:** A schema-valid `ActionProposal` exists for the current observation.
- **Allowed inputs:** The `ActionProposal` handed to **M10** (action guard) and the resulting `ValidatedAction` (`INTERFACES.md` §6); the `ExecutionResult` returned by **M11** (`INTERFACES.md` §7).
- **Allowed transitions:** `EXECUTING → VERIFYING` on an `ExecutionResult`.
- **Exit condition:** An `ExecutionResult` has been received for the action.
- **Failure transitions:** `EXECUTING → RECOVERY` when M10 rejects the action (`status: 'STALE'` or `'REJECTED'` — element missing/shifted beyond 5 px, or observation older than 2000 ms) or when M11 returns `status: 'FAILURE'`.
- **Recovery behaviour:** `RECOVERY` returns to `OBSERVING` so that a fresh observation precedes any re-plan. A rejected or stale action is never retried against the old observation.
- **Observable evidence:** `ExecutionResult` (`action_id`, `status`, optional `error_message`) recorded in orchestrator state.
- **Boundary note:** M01 never dispatches input events itself; execution authority sits with M10/M11 (`docs/architecture/DEPENDENCIES.md` §2).

### 2.6 `VERIFYING`
- **Purpose:** Determine whether the action achieved its `intended_effect` and decide whether the task is complete.
- **Entry condition:** An `ExecutionResult` was received for the current action.
- **Allowed inputs:** The `ExecutionResult`; the post-execution re-observation `RawObservation` (obtained via **M02**, per REQ-011); the `intended_effect` on the proposal; the resulting `VerificationResult` (`INTERFACES.md` §7).
- **Allowed transitions:**
  - `VERIFYING → COMPLETED` when the action returned `SUCCESS` and the goal is achieved.
  - `VERIFYING → OBSERVING` when the goal is not yet achieved (closed loop, REQ-015).
  - `VERIFYING → ABORTED` when the consecutive-verification-failure limit (3) is reached (`docs/system-design/SYSTEM-DESIGN.md` §2 M01 "3 consecutive verification failures").
- **Exit condition:** A completion decision or a loop-back decision has been made.
- **Failure transitions:** `VERIFYING → RECOVERY` if the post-execution re-observation itself fails.
- **Recovery behaviour:** `RECOVERY → OBSERVING`. Verification failure is not a privacy event and never causes raw data to be re-sent; it causes re-observation and re-planning.
- **Observable evidence:** `VerificationResult` (`action_id`, `intended_effect_achieved`, `confidence`) and a per-task count of consecutive verification failures.

### 2.7 `RECOVERY`
- **Purpose:** The single, explicit, fail-closed handling state for every recoverable fault. There is no silent error path anywhere in the loop.
- **Entry condition:** Entry from any active state (`OBSERVING`, `AUTHORIZING`, `REASONING`, `EXECUTING`, `VERIFYING`) via a failure transition above.
- **Allowed inputs:** The structured fault record (originating state, failing module, error kind).
- **Allowed transitions:** `RECOVERY → OBSERVING` when retry budget remains and a fresh observation is obtainable; `RECOVERY → ABORTED` when the retry budget is exhausted or the fault is a hard privacy block.
- **Exit condition:** A recovery decision (retry or abort) has been taken.
- **Failure transitions:** `RECOVERY → ABORTED` on unrecoverable faults (e.g. `chrome.debugger` cannot attach after its single re-attach attempt — `docs/system-design/SYSTEM-DESIGN.md` §2 M02).
- **Recovery behaviour:** Recovery must **never** weaken privacy to make progress (PRIV-008). A privacy uncertainty is a hard block, not a retry candidate. Retries are always preceded by a fresh observation so no stale context is reused.
- **Observable evidence:** Fault record (origin state + error kind), retry-count and terminal decision; an "alert the user" signal on abort.

### 2.8 `COMPLETED`
- **Purpose:** Terminal success. The task goal was achieved and verified.
- **Entry condition:** `VERIFYING` determined the goal achieved.
- **Allowed inputs:** Final `VerificationResult`.
- **Allowed transitions:** `COMPLETED → IDLE` on acknowledgement/teardown.
- **Exit condition:** Terminal state reached. No in-flight action, proposal, or observation is retained.
- **Failure transitions:** None (terminal).
- **Recovery behaviour:** Not applicable.
- **Observable evidence:** Task result reported to the popup; the agent no longer holds an active task.

### 2.9 `ABORTED`
- **Purpose:** Terminal failure. The task stopped without achieving its goal, with a user-visible reason.
- **Entry condition:** `VERIFYING` exceeded the consecutive verification-failure limit; `RECOVERY` exhausted its retry budget; or a hard privacy block occurred.
- **Allowed inputs:** Terminal fault record.
- **Allowed transitions:** `ABORTED → IDLE` on acknowledgement/teardown.
- **Exit condition:** Terminal state reached.
- **Failure transitions:** None (terminal).
- **Recovery behaviour:** Not applicable. A new attempt requires a new User Task Goal from `IDLE`.
- **Observable evidence:** User-visible alert including the abort reason and the originating state.

---

## 3. Canonical Transition Table

| From | To | Trigger / condition |
|---|---|---|
| `IDLE` | `OBSERVING` | User Task Goal accepted |
| `OBSERVING` | `AUTHORIZING` | Valid `RawObservation` received |
| `AUTHORIZING` | `REASONING` | `SanitizedObservation` (matching `observation_id`) produced |
| `REASONING` | `EXECUTING` | Schema-valid `ActionProposal` received (matching `observation_id`) |
| `EXECUTING` | `VERIFYING` | `ExecutionResult` received |
| `VERIFYING` | `COMPLETED` | Goal achieved |
| `VERIFYING` | `OBSERVING` | Goal not yet achieved (closed loop) |
| `VERIFYING` | `ABORTED` | 3 consecutive verification failures |
| `OBSERVING` / `AUTHORIZING` / `REASONING` / `EXECUTING` / `VERIFYING` | `RECOVERY` | Module fault, timeout, malformed data, stale/rejected action, or privacy uncertainty |
| `RECOVERY` | `OBSERVING` | Retry budget remains |
| `RECOVERY` | `ABORTED` | Retry budget exhausted, or hard privacy block |
| `COMPLETED` | `IDLE` | Task acknowledged |
| `ABORTED` | `IDLE` | Task acknowledged |

**No other transition is permitted.** Any transition not listed here is a defect. In particular: no state may skip `AUTHORIZING` (privacy must precede `REASONING`), and no state may skip `EXECUTING`'s validation path (an unvalidated proposal is never executed).

## 4. Invariants

1. **Network egress is gated by `AUTHORIZING`.** Data may be transmitted to M09 only in `REASONING`, and only from a `SanitizedObservation`. A bypass is a privacy defect (PRIV-002).
2. **Execution is gated by `EXECUTING`'s validation.** No action is dispatched without an M10 `ValidatedAction`.
3. **Fail-closed.** Every fault route leads to `RECOVERY` and then to a fresh observation or `ABORTED`. No fault route silently continues, and none relaxes privacy.
4. **Unknown remains unknown.** `AUTHORIZING` must not coerce `UNKNOWN` (M06's third bucket, `docs/perception/PERCEPTION-FUSION.md` §3) into "not observed" or "safe" (PRIV-006).

## 5. Relationship to Other Documents

| Document | Relationship |
|---|---|
| `docs/agent/AGENT-LOOP.md` | Describes the same loop in **pipeline-stage** terms (OBSERVE/UNDERSTAND/PROTECT/REASON/VALIDATE/ACT/OBSERVE/VERIFY). `AUTHORIZING` corresponds to UNDERSTAND+PROTECT; `EXECUTING` corresponds to VALIDATE+ACT. The pipeline stages are conceptual and are not the M01 state names. |
| `MODULES.md` (M01) | Lists the canonical states and points here. |
| `docs/system-design/SYSTEM-DESIGN.md` (§2 M01) | References this model for the state list and failure/recovery rules. |
| `INTERFACES.md` | Defines the data crossing each hand-off. M01 state names do not appear in any interface. |
| `docs/tasks/T002.md` | Implements this model. |
| `docs/tasks/T015.md` | Implements the `VERIFYING → OBSERVING / COMPLETED / ABORTED` decision logic and the closed loop. |

**Superseded material:** the earlier `TASK_RECEIVED`, `PERCEIVING`, `FUSING`, `PRIVACY_CHECK`, `SANITIZING`, `READY_FOR_REASONING`, `ACTION_VALIDATION`, and `FAILED` names are **retired**. `TASK_RECEIVED` folds into the `IDLE → OBSERVING` trigger; the perception/privacy stages fold into `AUTHORIZING`; `FAILED` is realised as `ABORTED`.
