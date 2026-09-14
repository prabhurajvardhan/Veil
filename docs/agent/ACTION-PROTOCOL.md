# VEIL — Action Protocol

Status: DRAFT (PROPOSED schema; structure CONFIRMED). This is critical because VEIL is an agent: it defines exactly how an action moves from cloud proposal → local validation → browser execution.

## 1. Invariant

**The cloud never directly controls the browser.** [CONFIRMED — PRIV-004] Every action the cloud proposes must pass local validation (PRIV-005) and be executed only by the local executor.

## 2. The Flow

```
Cloud reasoning model
   → structured ActionProposal (inbound over network)
   → Local Action Guard (M08): schema + staleness + authorization check
   → ValidatedAction (local)
   → Browser Executor (M09): re-check state, execute, re-observe
```

## 3. ActionProposal Schema (PROPOSED draft — to be finalized at system design freeze)

```ts
// PROPOSED — illustrative only, NOT frozen
interface ActionProposal {
  actionId: string;          // unique id for this proposal
  observationId: string;     // the observation the cloud reasoned against
  type: ActionType;          // click | type | navigate | ... [vocabulary UNKNOWN]
  target?: ElementRef;       // element/region reference (id from sanitized context)
  parameters?: Record<string, unknown>;
  confidence?: number;       // [PROPOSED] optional model confidence
}

interface ElementRef {
  elementId: string;         // id from the sanitized context
  // NOTE: the element referenced by elementId was sanitized; the raw
  // element content must NOT be sent back in the proposal.
}
```

- `ActionType` vocabulary: [UNKNOWN — VALIDATION REQUIRED] to be enumerated at design freeze.
- `confidence` optional: if present, how the guard uses it is [PROPOSED]; low confidence may gate high-risk actions.

## 4. Validation Requirements (M08, local)

| Check | Rule | On failure |
|---|---|---|
| Schema validity | Proposal matches the schema; fields well-formed | Reject |
| Observation freshness | Referenced `observationId` matches the latest observation; state fingerprint still current | Reject + re-observe (stale) |
| Authorization | Action type/target permitted in the current state (e.g., no redirect to sensitive pages, no targeting redacted elements) | Reject |

- Rejection is the required behavior for any failed check [CONFIRMED].
- Repeated invalid proposals → policy [UNKNOWN — VALIDATION REQUIRED].

## 5. Dangerous-Action Handling

Actions touching sensitive elements (e.g., password fields) or having broad effect require explicit authorization rules [PROPOSED]. An action targeting a redacted/hidden element is treated as unauthorized by default unless a defined rule permits it. See `docs/privacy/PRIVACY-TESTING.md` scenarios 11 and 13.

## 6. Stale-State Protection

- Each observation carries ID + timestamp + freshness + state fingerprint (mechanism [UNKNOWN — PROPOSED: state hash]).
- The guard rejects proposals referencing a stale observation → state machine re-observes.
- The executor re-checks target/page state immediately before acting to narrow the stale window [PROPOSED].

## 7. Execution Result

`ValidatedAction → ExecutionResult { status: success|failure; resultDetail? }` (IF-EXEC). Execution always triggers re-observation (no direct EXECUTING → COMPLETED).

## 8. Verification

The re-observed state is compared to the expected post-action state to verify the action/task succeeded. Verification uses sanitized context only.

## 9. Non-Goals (explicit)

- The cloud does not choose raw element coordinates from live pixels it never sees; it reasons over sanitized element references.
- The cloud cannot inject free-form text as an action; proposals are structured (ADR-007).

## 10. Open Questions

- [UNKNOWN] ActionType vocabulary enumeration.
- [UNKNOWN] Staleness fingerprint mechanism.
- [UNKNOWN] Repeated-invalid-proposal policy.
- [UNKNOWN] Whether `confidence` is required and how it gates execution.