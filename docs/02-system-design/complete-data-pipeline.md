# VEIL — Complete Data Pipeline

Status: DRAFT.

## Full Lifecycle (CONFIRMED sequence from brief)

```
USER TASK
→ observation trigger
→ screenshot/page capture
→ local perception
→ DOM/A11y evidence
→ optional OCR
→ perception fusion
→ confidence/sufficiency
→ privacy detection
→ redaction/sanitization
→ verification
→ sanitized observation
→ network transmission
→ cloud reasoning
→ structured action proposal
→ local validation
→ execution
→ re-observation
→ verification
```

## Transition Detail

### USER TASK → observation trigger
- Input: natural-language task string.
- Processing: agent transitions from IDLE to UNDERSTANDING_TASK, then triggers an observation (see `04-state/state-machine.md`).
- Output: observation request.
- Owner: PROPOSED — task/orchestration module.
- Trust Level: user-provided input, untrusted until parsed.
- Privacy Implications: the task text itself may contain sensitive info the user typed — UNKNOWN whether task text is in-scope for sanitization; VALIDATION REQUIRED.
- Failure Behavior: UNKNOWN — not yet specified.

### observation trigger → screenshot/page capture
- Input: observation request.
- Processing: capture screenshot and/or DOM/A11y snapshot from the browser.
- Output: raw observation (screenshot + DOM/A11y tree).
- Owner: PROPOSED — observation module, browser-boundary side.
- Trust Level: local runtime boundary; raw and unsanitized.
- Privacy Implications: raw observation may contain any sensitive content the page displays; must never cross the network boundary in this form.
- Failure Behavior: UNKNOWN (e.g., page not loaded, permission denied) — VALIDATION REQUIRED.

### screenshot/page capture → local perception (ShowUI-2B)
- Input: raw screenshot.
- Processing: ShowUI-2B runs locally to produce visual grounding (element locations/labels).
- Output: visual grounding result.
- Owner: local perception module.
- Trust Level: local runtime boundary.
- Privacy Implications: still contains raw-derived visual information; not yet sanitized.
- Failure Behavior: UNKNOWN model-failure handling — VALIDATION REQUIRED.

### local perception → DOM/A11y evidence → optional OCR → perception fusion
- Input: visual grounding result + DOM/A11y tree (+ optional OCR output when visual/DOM evidence is insufficient).
- Processing: fuse multiple evidence sources into one perception result with confidence and provenance per `perception/perception-fusion.md`.
- Output: fused perception result.
- Owner: perception fusion module.
- Trust Level: local runtime boundary.
- Privacy Implications: this is the last representation before privacy detection runs; must not leak out of the local boundary.
- Failure Behavior: insufficient confidence → PROPOSED: mark state as UNKNOWN rather than guessing (see `04-state/observation-state.md`).

### perception fusion → confidence/sufficiency → privacy detection
- Input: fused perception result.
- Processing: privacy engine scans fused result for sensitive content (DOM-based and visual detection; see `privacy/privacy-engine.md`).
- Output: sensitivity classification per element/region.
- Owner: privacy engine.
- Trust Level: local runtime boundary, privacy-critical.
- Privacy Implications: this is the primary privacy control point.
- Failure Behavior: CONFIRMED principle — if detection is uncertain, fail closed (treat as sensitive), never expose more data on uncertainty.

### privacy detection → redaction/sanitization → verification
- Input: sensitivity classification + fused perception result.
- Processing: redact/transform sensitive elements; verify the sanitized output does not still contain sensitive content (`privacy/redaction-verification.md`).
- Output: sanitized observation.
- Owner: privacy engine (sanitization + verification sub-stages).
- Trust Level: boundary between local runtime and network boundary.
- Privacy Implications: this is the last point sensitive data can be caught before transmission.
- Failure Behavior: verification failure → PROPOSED: block transmission entirely rather than send partially-sanitized data.

### sanitized observation → network transmission → cloud reasoning
- Input: sanitized observation (structured).
- Processing: transmit sanitized context to the cloud reasoning model; the model reasons over it.
- Output: model response.
- Owner: reasoning module (client side) + cloud reasoning model (external).
- Trust Level: crosses the network boundary — the only stage that does.
- Privacy Implications: only sanitized, structured data should ever be observed on the wire here (see `10-quality/privacy-testing.md`, "cloud payload inspection").
- Failure Behavior: UNKNOWN network/model failure handling — VALIDATION REQUIRED.

### cloud reasoning → structured action proposal → local validation
- Input: model response.
- Processing: parse into a structured action proposal schema; local validator checks it against current page state, schema, and authorization rules.
- Output: validated (or rejected) action.
- Owner: execution module (validation sub-stage).
- Trust Level: crosses back over the network boundary into the local runtime; treated as untrusted input until validated.
- Privacy Implications: the proposal itself should not need to contain sensitive data — VALIDATION REQUIRED to confirm this holds in practice.
- Failure Behavior: CONFIRMED principle — invalid/unauthorized proposals must not execute (see `10-quality/acceptance-tests.md`, scenario 6).

### local validation → execution → re-observation → verification
- Input: validated action.
- Processing: execute in the browser; re-observe; verify outcome against expectation.
- Output: task state update (success/failure/continue).
- Owner: execution module (execution + verification sub-stages).
- Trust Level: execution boundary.
- Privacy Implications: re-observation restarts the pipeline from the top (screenshot/page capture) — same privacy handling applies again.
- Failure Behavior: UNKNOWN — VALIDATION REQUIRED (see `10-quality/failure-matrix.md`).
