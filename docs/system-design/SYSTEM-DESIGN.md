# VEIL — System Design

Status: DRAFT (PROPOSED). This document goes deeper than the architecture to detail the actual lifecycle of the system.

## Stage 1: Observation Acquisition (M02)
- **INPUT:** Trigger from M01 Orchestrator (e.g., Task started, or post-action verification).
- **PROCESSING:** Extracts screenshot, DOM tree, accessibility info, page metadata (URL, viewport), and generates a state hash/timestamp.
- **OUTPUT:** `RawObservation` (kept entirely local).
- **VALIDATION:** Checks if tab is active and accessible.
- **FAILURE / RECOVERY:** If capture fails (permissions, tab closed), state machine transitions to RECOVERY or FAILED. Task halts if observation is impossible.

## Stage 2: Local Visual Perception (M03)
- **INPUT:** Screenshot from `RawObservation`.
- **PROCESSING:** Runs on-device visual grounding (currently ShowUI-2B) to identify element boundaries, roles, and visual semantic labels.
- **OUTPUT:** `VisualEvidence`.
- **VALIDATION:** Ensures bounding boxes fall within viewport bounds.
- **FAILURE / RECOVERY:** If model times out or OOMs, output is empty/unknown. The system degrades capability (may rely only on DOM) but NEVER leaks privacy.

## Stage 3: DOM / Accessibility Grounding (M04)
- **INPUT:** DOM/A11y tree from `RawObservation`.
- **PROCESSING:** Parses structured nodes, ARIA roles, text content, and coordinates.
- **OUTPUT:** `DomEvidence`.
- **VALIDATION:** Verifies coordinates map to viewport.
- **FAILURE / RECOVERY:** If DOM is inaccessible (e.g., cross-origin iframe without permissions), treats region as unknown. 

## Stage 4: Targeted OCR (M05)
- **INPUT:** Screenshot regions where DOM and Visual evidence are insufficient (e.g., Canvas elements).
- **PROCESSING:** Runs local text extraction.
- **OUTPUT:** `OcrEvidence`.
- **VALIDATION:** Confidence scores required for extracted text.
- **FAILURE / RECOVERY:** If OCR fails, region text is marked UNKNOWN.

## Stage 5: Perception Fusion (M06)
- **INPUT:** `VisualEvidence`, `DomEvidence`, `OcrEvidence`.
- **PROCESSING:** Merges evidence into a unified spatial map. Reconciles conflicts.
- **OUTPUT:** `PerceptionResult` (Structured array of candidate elements, relationships, freshness, uncertainty).
- **VALIDATION:** Must explicitly distinguish between OBSERVED, NOT OBSERVED, and UNKNOWN.
- **FAILURE / RECOVERY:** Conflicting evidence (e.g., DOM says "Submit", Visual says "Cancel") results in low confidence / UNKNOWN.

## Stage 6: Local Privacy Engine (M07)
- **INPUT:** `PerceptionResult`, Privacy Policies, Task Context.
- **PROCESSING:** Scans elements for passwords, API keys, tokens, cookies, PII, financial info, private messages, and sensitive DOM attributes (`type="password"`).
- **OUTPUT:** `PrivacyAssessment` (Classification of regions as safe, sensitive, or uncertain).
- **VALIDATION:** Uncertainty must be treated as sensitive (FAIL CLOSED).
- **FAILURE / RECOVERY:** If the engine crashes or takes too long, the entire observation is marked sensitive. No data leaves the device.

## Stage 7: Sanitization / Redaction (M08)
- **INPUT:** `PerceptionResult` + `PrivacyAssessment`.
- **PROCESSING:** Applies transformations: masking, redaction, blurring, semantic replacement, or complete omission of sensitive fields.
- **OUTPUT:** `SanitizedObservation` (A structured, minimized representation).
- **VALIDATION:** Redaction verification step ensures no sensitive data remains in the structured output.
- **FAILURE / RECOVERY:** If sanitization fails or errors, transmission is blocked.

## Stage 8: Remote Reasoning (M09)
- **INPUT:** `SanitizedObservation` + Task Context sent across the network.
- **PROCESSING:** Cloud LLM processes the minimized state and plans the next step.
- **OUTPUT:** `ActionProposal` (Action ID, target ID, type, parameters, expected effect).
- **VALIDATION:** Proposal schema validation.
- **FAILURE / RECOVERY:** Network timeout, malformed proposal, or API error triggers RECOVERY. Agent asks for a new proposal or halts.

## Stage 9: Local Action Guard (M10)
- **INPUT:** `ActionProposal` + Current `RawObservation` metadata (timestamps/hashes).
- **PROCESSING:** Validates target exists, observation is not stale, action type is permitted, and risk constraints are met.
- **OUTPUT:** `ValidatedAction`.
- **VALIDATION:** Rejects stale actions (Browser changed between Observation and Action).
- **FAILURE / RECOVERY:** If stale or unauthorized, the action is rejected. Triggers Re-Observe → Re-Plan. 

## Stage 10: Browser Execution (M11)
- **INPUT:** `ValidatedAction`.
- **PROCESSING:** Invokes browser extension APIs to perform the click, type, scroll, or navigation.
- **OUTPUT:** `ExecutionResult`.
- **VALIDATION:** Checks if API call succeeded.
- **FAILURE / RECOVERY:** If element detached mid-execution, execution fails. Triggers Re-Observe.

## Stage 11: Verification (M01 / M02)
- **INPUT:** `ExecutionResult`.
- **PROCESSING:** M01 orchestrator triggers M02 to observe again. Verifies if the intended effect of the action occurred.
- **OUTPUT:** State machine advances to next reasoning step or COMPLETED.
- **VALIDATION:** Compares new state against expected state.
- **FAILURE / RECOVERY:** If effect didn't occur (e.g., modal didn't open), logic loops back to REASONING to try an alternative.
