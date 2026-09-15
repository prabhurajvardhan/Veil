# VEIL — Interface Contracts

Status: DRAFT (PROPOSED). Conceptual contract chain defining exactly how data moves through VEIL.

## 1. Contract Chain

| Producer | Contract | Consumer | Purpose |
|---|---|---|---|
| M02 | `RawObservation` | M03, M04, M05 | Contains local screenshot buffer, DOM tree, A11y tree, state hash, timestamp. |
| M03 | `VisualEvidence` | M06 | Bounding boxes, visual semantic labels. |
| M04 | `DomEvidence` | M06 | DOM node refs, ARIA roles, text content, interactability. |
| M05 | `OcrEvidence` | M06 | Extracted text strings and coordinates. |
| M06 | `PerceptionResult` | M07, M08 | Fused elements, relationships, explicit confidence levels, uncertainty flags. |
| M07 | `PrivacyAssessment` | M08 | Map of elements to classifications (safe, sensitive, uncertain). |
| M08 | `SanitizedObservation` | M09 | Minimized, structured state. Contains `safe_elements`, `redacted_regions`, `state_hash`. |
| Orchestrator | `ReasoningRequest` | M09 | Wraps `SanitizedObservation` with task context and history. |
| M09 | `ActionProposal` | M10 | Structured proposal: action ID, target ID, type, parameters, intended effect. |
| M10 | `ValidatedAction` | M11 | Action verified safe to execute locally. |
| M11 | `ExecutionResult` | Orchestrator | Success/failure boolean and error details. |
| Orchestrator | `VerificationResult` | Orchestrator | Outcome of re-observation comparison against intended effect. |

## 2. Invariants
- `RawObservation`, `VisualEvidence`, `DomEvidence`, and `OcrEvidence` MUST NEVER be serialized for network transport.
- `ActionProposal` MUST NOT contain executable code (e.g., raw JavaScript payloads to inject). It is a declarative intent.
- `SanitizedObservation` MUST structurally omit or mask data marked sensitive or uncertain by `PrivacyAssessment`.
