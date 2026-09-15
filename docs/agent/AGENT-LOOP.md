# VEIL — Agent Loop

Status: DRAFT (PROPOSED). Conceptual pipeline-stage view. The **authoritative M01 state machine** is `docs/agent/STATE-MACHINE.md` (ADR 009); the stages below are pipeline concerns, not M01 state names. VEIL is a **CLOSED-LOOP** agent. It does not operate on a simple "Observe once → Reason once → Execute once" paradigm.

## 1. The Core Loop Stages

Every task iterates through the following sequence:

1. **OBSERVE**: M02 extracts current browser state.
2. **UNDERSTAND**: M03, M04, and M05 extract local features.
3. **PROTECT**: M06, M07, and M08 fuse, assess, and sanitize the data locally.
4. **REASON**: M09 (Cloud) receives sanitized data and proposes an action.
5. **VALIDATE**: M10 checks if the proposal is safe, permitted, and based on fresh data.
6. **ACT**: M11 executes the validated action in the browser.
7. **OBSERVE**: M02 takes a fresh observation of the new page state.
8. **VERIFY**: The system determines if the expected state change occurred.

## 2. Why Every Stage Exists
- **Understand & Protect** exist sequentially because privacy rules require knowing what an element is before deciding if it's sensitive.
- **Validate** exists before Act because the remote reasoner is untrusted and cannot execute code directly.
- **Observe & Verify** exist after Act because browser state is highly dynamic. An action might fail silently, trigger a modal, or navigate unexpectedly. The agent must verify the effect before deciding the task is complete.

## 3. Stale State Handling
If a page changes between Step 1 (Observe) and Step 6 (Act), the action might click the wrong element or leak data. VEIL prevents this by ensuring M10 (Validate) checks the original Observation ID/Hash against the current browser state. If stale, the loop aborts the action and restarts at Step 1 (Observe).
