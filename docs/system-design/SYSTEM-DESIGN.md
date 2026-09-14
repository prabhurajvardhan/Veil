# VEIL — System Design

Status: DRAFT (V0, not frozen). See `docs/freezes/SYSTEM-DESIGN.md`.
This document goes one level below architecture (`docs/architecture/ARCHITECTURE.md`) into implementation design for every pipeline stage. Schemas marked PROPOSED are placeholders to be finalized before implementation; nothing below is frozen.

Each stage specifies: INPUT / PROCESSING / OUTPUT / INTERFACE / ERRORS / SECURITY / PRIVACY / VALIDATION.

---

## Stage 1 — Browser Observation (Trigger)

- **INPUT:** Observation request from the state machine (STATE `OBSERVING`).
- **PROCESSING:** Acquire a screenshot of the visible viewport (full page: [UNKNOWN]) and/or a DOM/accessibility-tree snapshot from the live tab.
- **OUTPUT:** Raw observation containing screenshot reference + DOM/A11y snapshot.
- **INTERFACE:** `ObservationRequest` → `RawObservation` (IF-OBS).
- **ERRORS:** Capture failure (permission denied, page not ready, tab closed). [PROPOSED] Must produce an explicit failure observation, never a silently empty one.
- **SECURITY:** Extension permission model [UNKNOWN].
- **PRIVACY:** Raw observation may contain any sensitive content the page displays. Must never cross the network boundary.
- **VALIDATION:** [PROPOSED] Unit test: capture returns non-empty for a live tab; failure returns explicit error.

## Stage 2 — Screenshot Acquisition

- **INPUT:** The screenshot component of the raw observation.
- **PROCESSING:** [PROPOSED] Capture raster image of the current page state on-device.
- **OUTPUT:** Local screenshot buffer (device-only).
- **INTERFACE:** N/A (internal).
- **ERRORS:** [UNKNOWN].
- **SECURITY:** Screenshot buffer must be held in local memory only.
- **PRIVACY:** Never serialized into any outbound payload (ADR-008).
- **VALIDATION:** [PROPOSED] Privacy test: assert screenshot bytes never appear on the wire.

## Stage 3 — DOM/A11y Extraction

- **INPUT:** The DOM/accessibility-tree snapshot.
- **PROCESSING:** Extract structural evidence: element roles, text content, interactability, attributes.
- **OUTPUT:** Structural evidence set.
- **INTERFACE:** N/A (internal to M02/M04).
- **ERRORS:** [UNKNOWN].
- **SECURITY:** DOM text may contain sensitive values (passwords, PII).
- **PRIVACY:** Sensitive DOM values must be detected and sanitized before any outbound payload (PRIV-001).
- **VALIDATION:** See privacy tests for "sensitive DOM values" and "password field visible".

## Stage 4 — Local Visual Perception (ShowUI)

- **INPUT:** Raw screenshot (local only, M03).
- **PROCESSING:** Run ShowUI-2B on-device to produce visual grounding (element locations, semantic labels).
- **OUTPUT:** Visual grounding result.
- **INTERFACE:** `ScreenshotReference` → `VisualGroundingResult` (IF-PERCEPTION).
- **ERRORS:** Model failure/timeout [UNKNOWN — VALIDATION REQUIRED].
- **SECURITY:** Model runs locally; no inference request to the cloud.
- **PRIVACY:** The screenshot never leaves the device; grounding output is still unsanitized until M05.
- **VALIDATION:** [VALIDATION REQUIRED] On-device inference performance/accuracy; hardware requirements [UNKNOWN].

## Stage 5 — Perception Fusion

- **INPUT:** Visual grounding result + DOM/A11y snapshot (+ optional OCR when evidence is insufficient).
- **PROCESSING:** Fuse into one structured perception result with confidence and provenance per element.
- **OUTPUT:** Fused perception result.
- **INTERFACE:** `VisualGroundingResult` + `StructuralEvidence` → `FusedPerception` (IF-FUSION).
- **ERRORS:** Conflicting evidence between sources → [PROPOSED] mark elements low-confidence/UNKNOWN rather than arbitrarily choosing.
- **SECURITY:** Fused result is the input to privacy detection; dropping evidence can cause a downstream privacy miss.
- **PRIVACY:** Must not silently drop evidence about potentially sensitive regions.
- **VALIDATION:** [VALIDATION REQUIRED] Fusion algorithm/heuristics [UNKNOWN]; confidence reconciliation [UNKNOWN].

## Stage 6 — Privacy Detection

- **INPUT:** Fused perception result.
- **PROCESSING:** Two complementary paths [PROPOSED]: (a) DOM-based detection — known sensitive field types (password inputs, autofill-tagged fields) and PII patterns; (b) visual detection — sensitive-looking regions not captured structurally.
- **OUTPUT:** Per-element/region sensitivity classification.
- **INTERFACE:** `FusedPerception` → `SensitivityClassification` (IF-PRIV-DETECT).
- **ERRORS:** Detection uncertainty → CONFIRMED fail-closed behavior (PRIV-007): treat as sensitive, expose nothing extra.
- **SECURITY:** This is the primary privacy control point.
- **PRIVACY:** Implement PRIV-001, PRIV-002, PRIV-006, PRIV-007, PRIV-008. Never coerce UNKNOWN to "not observed".
- **VALIDATION:** Privacy tests: password visible, email visible, phone visible, account number visible, sensitive DOM field, visual-only sensitive info.

## Stage 7 — Redaction / Sanitization

- **INPUT:** Sensitivity classification + fused perception result.
- **PROCESSING:** Transform detected sensitive content into safe form while preserving structure (mask, omit, or generalize — per-type rules [UNKNOWN, PROPOSED]).
- **OUTPUT:** Sanitized observation (pre-verification).
- **INTERFACE:** `SensitivityClassification` + `FusedPerception` → `SanitizedObservation` (IF-SANITIZE).
- **ERRORS:** [PROPOSED] Sanitization failure = detection uncertainty → fail closed, do not transmit.
- **SECURITY:** Never log or persist raw pre-sanitization data.
- **PRIVACY:** Different sensitivity types may need different treatments (password → omit; name → generalize) [PROPOSED].
- **VALIDATION:** Redaction tests: redaction box too small, redaction fails, insufficient redaction.

## Stage 8 — Redaction Verification

- **INPUT:** Sanitized observation (pre-verification).
- **PROCESSING:** [PROPOSED] Re-run (a subset of) detection against the sanitized output; require a clean result before transmission is permitted.
- **OUTPUT:** Verified sanitized observation.
- **INTERFACE:** `SanitizedObservation` → `VerifiedSanitizedObservation` (IF-VERIFY).
- **ERRORS:** Verification cannot confirm clean → block transmission (fail-closed; second gate beyond detection).
- **SECURITY:** Independent check on the sanitization step, not a duplicate of detection.
- **PRIVACY:** This is the last point sensitive data can be caught before transmission.
- **VALIDATION:** [VALIDATION REQUIRED] Performance cost of double-checking; per-transmission vs. sampled [UNKNOWN].

## Stage 9 — Sanitized Observation / Context Generation

- **INPUT:** Verified sanitized observation.
- **PROCESSING:** Build the structured sanitized-context payload for the network boundary.
- **OUTPUT:** Sanitized context.
- **INTERFACE:** `VerifiedSanitizedObservation` → `SanitizedContext` (IF-CONTEXT).
- **ERRORS:** [PROPOSED] If the builder cannot guarantee clean content, produce no output.
- **SECURITY:** Outbound payload; only field-level, post-sanitization data.
- **PRIVACY:** Invariant (CONFIRMED): no field may contain content that failed sanitization/verification.
- **VALIDATION:** Cloud payload inspection tests assert no raw sensitive data on the wire.

## Stage 10 — Network Transport

- **INPUT:** Sanitized context ready to send.
- **PROCESSING:** Transmit over the authenticated, encrypted channel to the reasoning service [PROPOSED: transport mechanism/protocol UNKNOWN].
- **OUTPUT:** Request delivered to cloud reasoning model; response received.
- **INTERFACE:** `SanitizedContext` → (network) → `ModelResponse` (IF-REASON).
- **ERRORS:** Timeout/unavailable [proposed]: surface clear failure state; never proceed with stale/guessed action.
- **SECURITY:** SEC-001 [PROPOSED] authenticated, encrypted transport.
- **PRIVACY:** Only sanitized structured data observed on the wire.
- **VALIDATION:** [UNKNOWN] network/timeout handling [VALIDATION REQUIRED]; payload inspection in privacy tests.

## Stage 11 — Cloud Reasoning

- **INPUT:** Sanitized context.
- **PROCESSING:** Remote model reasons over the context and proposes the next action.
- **OUTPUT:** Model response (to be parsed into a structured proposal).
- **INTERFACE:** Part of IF-REASON.
- **ERRORS:** Ranking of failure modes [UNKNOWN].
- **SECURITY:** Model/provider [UNKNOWN — do not assume any vendor]. No execution authority (PRIV-004).
- **PRIVACY:** Receives only sanitized context (PRIV-003, ADR-008).
- **VALIDATION:** [VALIDATION REQUIRED] Confirm the sanitized context schema is sufficient for the model to reason effectively.

## Stage 12 — Action Proposal Parsing

- **INPUT:** Model response.
- **PROCESSING:** [PROPOSED] Parse into the structured action-proposal schema (must be non-free-form per ADR-007).
- **OUTPUT:** Structured `ActionProposal`.
- **INTERFACE:** `ModelResponse` → `ActionProposal` (IF-ACTION).
- **ERRORS:** Malformed/unparseable proposal → reject; do not build an "empty" proposal (never coerce UNKNOWN).
- **SECURITY:** Inbound data treated as untrusted until validated (SEC-002).
- **PRIVACY:** Proposal itself should not need to contain sensitive info — [VALIDATION REQUIRED] confirm in practice.
- **VALIDATION:** Acceptance scenario 6 (cloud proposes invalid action).

## Stage 13 — Local Action Validation

- **INPUT:** Structured `ActionProposal` + current observation/state.
- **PROCESSING:** Check schema validity; staleness of referenced observation; authorization of action type/target in current state.
- **OUTPUT:** Validated action or rejection.
- **INTERFACE:** `ActionProposal` + `ObservationState` → `ValidatedAction` (IF-VALIDATE).
- **ERRORS:** CONFIRMED: invalid/stale/unauthorized must not execute.
- **SECURITY:** Sole local execution-authority gate (PRIV-005).
- **PRIVACY:** Rejection is fail-closed by design.
- **VALIDATION:** Acceptance scenarios 6 and 7; staleness mechanism [UNKNOWN — VALIDATION REQUIRED].

## Stage 14 — Browser Execution

- **INPUT:** Validated action.
- **PROCESSING:** [PROPOSED] Re-check target/page state immediately before acting; then execute via extension APIs; then trigger re-observation.
- **OUTPUT:** Execution result.
- **INTERFACE:** `ValidatedAction` → `ExecutionResult` (IF-EXEC).
- **ERRORS:** Element not found, action rejected by page, etc. [UNKNOWN — VALIDATION REQUIRED] (acceptance scenario 9).
- **SECURITY:** Executes only validated actions (never unvalidated cloud output).
- **PRIVACY:** Execution does not transmit page data.
- **VALIDATION:** Acceptance scenarios 7 and 9; re-check narrows stale window [PROPOSED].

## Stage 15 — Re-observation

- **INPUT:** Execution result.
- **PROCESSING:** Trigger a fresh observation, restarting the pipeline from Stage 1, so the consequence of the action is seen.
- **OUTPUT:** Fresh raw observation → re-enters pipeline.
- **INTERFACE:** `ExecutionResult` → `ObservationRequest`.
- **ERRORS:** (same as Stage 1).
- **SECURITY/PRIVACY:** Same rules as Stage 1 apply — re-observation does not bypass privacy.
- **VALIDATION:** Acceptance scenario 10 (re-observation after action).

## Stage 16 — Task Completion Verification

- **INPUT:** Fresh observation (sanitized pipeline result) + task goal.
- **PROCESSING:** Verify whether the action/task succeeded; decide complete/continue/fail.
- **OUTPUT:** Verification result.
- **INTERFACE:** `VerificationResult` (IF-VERIFY-CLOOP).
- **ERRORS:** Failure → recovery paths per `docs/agent/STATE-MACHINE.md`.
- **SECURITY/PRIVACY:** Verification uses sanitized context only.
- **VALIDATION:** Acceptance scenario 1; failure matrix scenarios 5–9.

---

## Open Design Items (gathered, not invented)
- [UNKNOWN] Exact field-level schemas for `SanitizedContext` and `ActionProposal` — frozen only after System Design Freeze.
- [UNKNOWN] Fusion algorithm, confidence reconciliation, sanitization per-type rules.
- [UNKNOWN] Staleness-detection mechanism (e.g., state hash).
- [UNKNOWN] Transport protocol, model/provider, extension permission model.