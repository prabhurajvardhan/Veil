# VEIL — Module Registry

Status: FROZEN. This is the authoritative registry of software boundaries for the VEIL project.

## M01: Browser Agent Core / Orchestrator
- **Purpose:** Coordinates agent lifecycle, state machine, and closed-loop execution.
- **Responsibilities:** Manages state transitions (IDLE, OBSERVING, REASONING, EXECUTING, VERIFYING, RECOVERY, COMPLETED). Triggers other modules.
- **Non-responsibilities:** Does not perform reasoning, perception, or direct execution.
- **Inputs:** `ExecutionResult`, `VerificationResult`.
- **Outputs:** Triggers for `ObservationManager`, `ReasoningRequest`.
- **Dependencies:** M02, M09, M10, M11.
- **Interfaces:** `ReasoningRequest`, `VerificationResult`.
- **State Ownership:** Global agent lifecycle state.
- **Boundaries:** Local execution only.
- **Allowed Files:** `/src/m01-core/*`
- **Forbidden Files:** Any file outside `/src/m01-core/`
- **Related Tasks:** T001, T002, T015.
- **Integration Milestones:** M0, M1, M5.

## M02: Observation Manager
- **Purpose:** Obtains raw browser state securely.
- **Responsibilities:** Captures screenshots, DOM trees, accessibility trees, and generates state hashes/timestamps.
- **Non-responsibilities:** Does not parse or understand the content.
- **Inputs:** Trigger from M01.
- **Outputs:** `RawObservation`.
- **Dependencies:** Browser APIs.
- **Interfaces:** `RawObservation`.
- **State Ownership:** Snapshot of the browser state at a specific timestamp.
- **Boundaries:** Local execution only.
- **Allowed Files:** `/src/m02-observation/*`
- **Forbidden Files:** Any file outside `/src/m02-observation/`
- **Related Tasks:** T003, T004.
- **Integration Milestones:** M1.

## M03: Local Visual Perception
- **Purpose:** Extracts visual understanding locally using VLMs.
- **Responsibilities:** Runs ShowUI-2B (or similar) on screenshots to generate bounding boxes and semantic labels.
- **Non-responsibilities:** Does not touch the DOM.
- **Inputs:** `RawObservation`.
- **Outputs:** `VisualEvidence`.
- **Dependencies:** M02.
- **Interfaces:** `VisualEvidence`.
- **State Ownership:** Stateless.
- **Boundaries:** Local execution only.
- **Allowed Files:** `/src/m03-visual/*`
- **Forbidden Files:** Any file outside `/src/m03-visual/`
- **Related Tasks:** T005.
- **Integration Milestones:** M2.

## M04: DOM / Accessibility Grounding
- **Purpose:** Parses structural browser info.
- **Responsibilities:** Extracts element identities, roles, and coordinates from the DOM/A11y trees.
- **Non-responsibilities:** Does not analyze pixels.
- **Inputs:** `RawObservation`.
- **Outputs:** `DomEvidence`.
- **Dependencies:** M02.
- **Interfaces:** `DomEvidence`.
- **State Ownership:** Stateless.
- **Boundaries:** Local execution only.
- **Allowed Files:** `/src/m04-dom/*`
- **Forbidden Files:** Any file outside `/src/m04-dom/`
- **Related Tasks:** T006.
- **Integration Milestones:** M2.

## M05: Targeted OCR
- **Purpose:** Local text extraction when visual/DOM evidence is insufficient.
- **Responsibilities:** Extracts text strings and coordinates from specific screenshot regions.
- **Non-responsibilities:** Does not process full pages unless required.
- **Inputs:** `RawObservation`.
- **Outputs:** `OcrEvidence`.
- **Dependencies:** M02.
- **Interfaces:** `OcrEvidence`.
- **State Ownership:** Stateless.
- **Boundaries:** Local execution only.
- **Allowed Files:** `/src/m05-ocr/*`
- **Forbidden Files:** Any file outside `/src/m05-ocr/`
- **Related Tasks:** T007.
- **Integration Milestones:** M2.

## M06: Perception Fusion
- **Purpose:** Unified perception model.
- **Responsibilities:** Combines `VisualEvidence`, `DomEvidence`, and `OcrEvidence` into a single `PerceptionResult`. Reconciles conflicts and calculates confidence.
- **Non-responsibilities:** Does not classify privacy sensitivity.
- **Inputs:** `VisualEvidence`, `DomEvidence`, `OcrEvidence`.
- **Outputs:** `PerceptionResult`.
- **Dependencies:** M03, M04, M05.
- **Interfaces:** `PerceptionResult`.
- **State Ownership:** Stateless.
- **Boundaries:** Local execution only.
- **Allowed Files:** `/src/m06-fusion/*`
- **Forbidden Files:** Any file outside `/src/m06-fusion/`
- **Related Tasks:** T008, T009.
- **Integration Milestones:** M2.

## M07: Local Privacy Engine
- **Purpose:** Fail-closed sensitive data detection.
- **Responsibilities:** Evaluates `PerceptionResult` against privacy policies. Classifies elements as safe, sensitive, or uncertain.
- **Non-responsibilities:** Does not mutate or redact data.
- **Inputs:** `PerceptionResult`.
- **Outputs:** `PrivacyAssessment`.
- **Dependencies:** M06.
- **Interfaces:** `PrivacyAssessment`.
- **State Ownership:** Stateless.
- **Boundaries:** Local execution only. MUST NEVER transmit data.
- **Allowed Files:** `/src/m07-privacy/*`
- **Forbidden Files:** Any file outside `/src/m07-privacy/`
- **Related Tasks:** T010.
- **Integration Milestones:** M3.

## M08: Sanitization / Redaction
- **Purpose:** Produces safe data for network transport.
- **Responsibilities:** Redacts, masks, or omits nodes marked sensitive/uncertain by M07.
- **Non-responsibilities:** Does not define what is sensitive.
- **Inputs:** `PerceptionResult`, `PrivacyAssessment`.
- **Outputs:** `SanitizedObservation`.
- **Dependencies:** M06, M07.
- **Interfaces:** `SanitizedObservation`.
- **State Ownership:** Stateless.
- **Boundaries:** Local execution only. Last module before the network.
- **Allowed Files:** `/src/m08-sanitization/*`
- **Forbidden Files:** Any file outside `/src/m08-sanitization/`
- **Related Tasks:** T011.
- **Integration Milestones:** M3, M4.

## M09: Remote Reasoner Gateway
- **Purpose:** Network interface to the Cloud LLM.
- **Responsibilities:** Transmits `SanitizedObservation`, handles network timeouts, parses `ActionProposal` responses.
- **Non-responsibilities:** Has NO execution authority. Does not bypass M08.
- **Inputs:** `SanitizedObservation`, `ReasoningRequest`.
- **Outputs:** `ActionProposal`.
- **Dependencies:** M08, Network APIs.
- **Interfaces:** `ActionProposal`.
- **State Ownership:** Stateless (passes through to LLM context).
- **Boundaries:** Network boundary.
- **Allowed Files:** `/src/m09-reasoning/*`
- **Forbidden Files:** Any file outside `/src/m09-reasoning/`
- **Related Tasks:** T012.
- **Integration Milestones:** M4, M5.

## M10: Local Action Guard
- **Purpose:** Execution authority validation.
- **Responsibilities:** Validates `ActionProposal` targets, checks staleness against current observation hash, and enforces risk policies.
- **Non-responsibilities:** Does not execute actions or reason.
- **Inputs:** `ActionProposal`, metadata from M02.
- **Outputs:** `ValidatedAction`.
- **Dependencies:** M09, M02.
- **Interfaces:** `ValidatedAction`.
- **State Ownership:** Stateless.
- **Boundaries:** Local execution only.
- **Allowed Files:** `/src/m10-guard/*`
- **Forbidden Files:** Any file outside `/src/m10-guard/`
- **Related Tasks:** T013.
- **Integration Milestones:** M5.

## M11: Browser Executor
- **Purpose:** Executes validated actions.
- **Responsibilities:** Interacts with Browser APIs (clicks, typing, scrolling) strictly for a `ValidatedAction`.
- **Non-responsibilities:** Does not validate actions or make decisions.
- **Inputs:** `ValidatedAction`.
- **Outputs:** `ExecutionResult`.
- **Dependencies:** M10.
- **Interfaces:** `ExecutionResult`.
- **State Ownership:** Interacts with live browser state.
- **Boundaries:** Local execution only.
- **Allowed Files:** `/src/m11-executor/*`
- **Forbidden Files:** Any file outside `/src/m11-executor/`
- **Related Tasks:** T014.
- **Integration Milestones:** M5.
