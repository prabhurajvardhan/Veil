# VEIL — Interface Contracts

Status: DRAFT (PROPOSED). No schema is frozen. Every schema is finalized only at System Design Freeze. Schemas below are illustrative TypeScript-style drafts intended to make boundaries concrete for planning; invariants and failure conditions are what count.

## Contract Points (from architecture)

| ID | Contract | Producer | Consumer |
|---|---|---|---|
| IF-TASK | `UserTask` | M01 (shell) | M10 (orchestration) |
| IF-OBS | `ObservationRequest` / `RawObservation` | M10 → M02 / M02 | M02 / M03, M04 |
| IF-PERCEPTION | `VisualGroundingResult` | M03 | M04 |
| IF-FUSION | `FusedPerception` | M04 | M05 |
| IF-PRIV-DETECT | `SensitivityClassification` | M05 (detection) | M05 (sanitization) |
| IF-SANITIZE | `SanitizedObservation` | M05 (sanitization) | M05 (verification) |
| IF-VERIFY | `VerifiedSanitizedObservation` | M05 (verification) | M06 |
| IF-CONTEXT | `SanitizedContext` | M06 | M07 → (cloud) |
| IF-REASON | `ModelResponse` | (cloud) → M07 | M07 (parser) |
| IF-ACTION | `ActionProposal` | M07 (parser) | M08 |
| IF-VALIDATE | `ValidatedAction` / `ValidationResult` | M08 | M09 |
| IF-EXEC | `ExecutionResult` | M09 | M10 |
| IF-VERIFY-CLOOP | `VerificationResult` | M10 | M10 (loop controller) |

**Dependency rule:** no module may depend on another module's internal implementation; contracts are the only allowed crossing points (`docs/architecture/DEPENDENCIES.md`).

## Schema Drafts (PROPOSED, not frozen)

```ts
// IF-TASK
interface UserTask { taskId: string; text: string; }

// IF-OBS
interface ObservationRequest { trigger: "TASK_START" | "POST_ACTION" | "RECOVERY"; }
interface RawObservation {
  observationId: string;
  timestamp: number;                 // freshness/staleness input
  screenshotRef: LocalRef;           // device-only; never serialized to network
  domA11ySnapshotRef: LocalRef;
  stateFingerprint: string;          // mechanism UNKNOWN — PROPOSED
}

// IF-PERCEPTION
interface VisualGroundingResult {
  observationId: string;
  elements: GroundedElement[];       // elementId, bbox/screenLocation, semanticLabel, confidence
}

// IF-FUSION
interface FusedPerception {
  observationId: string;
  elements: FusedElement[];          // elementId, role, text?, location, visualConfidence,
                                     // structuralConfidence, provenance[], tristate
  // tristate: OBSERVED | NOT_OBSERVED | UNKNOWN  (never collapse UNKNOWN — PRIV-006)
}

// IF-PRIV-DETECT
interface SensitivityClassification {
  elementId: string; sensitivity: "sensitive" | "not_sensitive" | "uncertain"; // uncertain → treated as sensitive
  detectionSource: "dom" | "visual" | "both" | "unknown";
}

// IF-SANITIZE / IF-VERIFY
interface SanitizedObservation { /* sanitized elements with redacted/generalized content */ }
interface VerifiedSanitizedObservation { sanitized: SanitizedObservation; verifiedCleanAt: number; }

// IF-CONTEXT
interface SanitizedContext {
  requestId: string;                // ties request to response
  task: string;                     // [UNKNOWN whether task text in-scope for sanitization]
  elements: SanitizedElement[];     // sanitized labels/roles/positions; NO raw sensitive content
  step: number;
  // Invariant: no field may contain content that failed sanitization/verification.
}

// IF-REASON
interface ModelResponse { requestId: string; rawModelText: string; }

// IF-ACTION
interface ActionProposal {
  actionId: string;
  observationId: string;            // staleness reference
  type: "click" | "type" | "navigate" | "scroll" | /* vocabulary UNKNOWN — VALIDATION REQUIRED */ "other";
  target?: { elementId: string; };  // elementId references the sanitized context, never raw content
  parameters?: Record<string, unknown>;
  confidence?: number;              // [PROPOSED] optional
}

// IF-VALIDATE
type ValidationResult = { verdict: "approved" | "rejected"; reason?: string; observationId: string; };
type ValidatedAction = ActionProposal & { validationId: string; }

// IF-EXEC
interface ExecutionResult { status: "success" | "failure"; resultDetail?: unknown; }

// IF-VERIFY-CLOOP
type VerificationResult = { outcome: "complete" | "continue" | "failed"; reason?: string; }
```

## Contract Specification Template (used at freeze)

For every contract, at System Design Freeze, fill:

- **Producer / Consumer**
- **Schema** (versioned)
- **Invariants** (e.g., "no raw sensitive content in SanitizedContext")
- **Failure conditions** (invalid proposal, stale observation, malformed model response)
- **Version** (semantic version per contract at freeze)
- **Ownership** (module that may change it; changing a frozen contract requires an ADR)

## Rules

1. No module may read another module's internal state; all data flows through contracts.
2. Contracts are versioned; changing a frozen contract requires an ADR and re-freeze.
3. The `SanitizedContext` contract is the single protected artifact of the network boundary.
4. `ActionProposal.observationId` (and the state fingerprint) exist so staleness can be enforced (PRIV-005, scenario 7).