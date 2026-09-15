# VEIL — Action Protocol

Status: DRAFT (PROPOSED). Defines how a remote proposal becomes a local execution.

## 1. The Protocol Flow
```text
ActionProposal (M09 Remote Reasoner)
        ↓
Local Action Guard (M10)
        ↓
ValidatedAction (M10)
        ↓
Browser Executor (M11)
        ↓
ExecutionResult (M11)
        ↓
Verification (M01/M02)
```

## 2. Remote Reasoner Authority
The remote reasoner is a **PROPOSER**. It has **NO EXECUTION AUTHORITY**. It cannot directly invoke browser APIs, inject JavaScript, or manipulate the DOM.

## 3. Action Proposal Structure (Conceptual)
An `ActionProposal` from M09 must reference:
- Action ID
- Observation ID (the specific state the reasoning was based on)
- Target (Sanitized Element ID)
- Action Type (e.g., click, type, select, navigate)
- Parameters (e.g., text to type)
- Intended effect (e.g., "Login modal should open")

## 4. Stale Action Protection
A critical failure mode occurs if the page changes while the remote reasoner is thinking.
- **M10 Local Action Guard** receives the proposal.
- It compares the proposal's `Observation ID` against the active browser state (via state hash or timestamp).
- **If Stale:** The action is REJECTED. The system triggers Re-Observe → Re-Plan. It does not execute blindly against changed state.

## 5. Validation Checks
M10 validates at minimum:
- Action target exists in current DOM.
- Observation freshness.
- Action type is in the allowed vocabulary.
- Action parameters do not violate policy (e.g., typing into a redacted field).
- Risk constraints (e.g., confirmation required for purchases or destructive actions).
