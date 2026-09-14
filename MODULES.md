# VEIL — Module Registry

Status: DRAFT (PROPOSED). Module boundaries are proposed, not frozen. See `docs/freezes/MODULES.md`. Ownership [UNKNOWN] until employee allocation. ID scheme replaces former VEIL-OBS…VEIL-STATE IDs (see ADR-011 in `DECISIONS.md`).

## Module Summary

| ID | Name | Short purpose | Status |
|---|---|---|---|
| M01 | Chrome Extension Shell | Host VEIL in the browser; lifecycle and entry points | PLANNED |
| M02 | Observation Engine | Capture screenshots + DOM/A11y snapshots | PLANNED |
| M03 | Local Visual Perception | Run ShowUI-2B on-device to produce visual grounding | PLANNED |
| M04 | Perception Fusion | Fuse visual + structural evidence into one structured result | PLANNED |
| M05 | Privacy Engine | Detect, sanitize, verify sensitive content before any egress | PLANNED |
| M06 | Sanitized Context Builder | Build the only cross-boundary outbound payload | PLANNED |
| M07 | Reasoning Gateway | Transport sanitized context; receive action proposals | PLANNED |
| M08 | Local Action Guard | Validate proposals (schema, staleness, authorization) | PLANNED |
| M09 | Browser Executor | Execute only validated actions; trigger re-observation | PLANNED |
| M10 | Agent State / Orchestration | State machine, task state, loop orchestration | PLANNED |
| M11 | Validation / Test Harness | Test-only harness for unit/integration/privacy tests | PLANNED |

These are PROPOSED; the boundary will be revised if system design reveals a better split.

## Module Definitions

### M01 — Chrome Extension Shell
- **PURPOSE:** Host VEIL inside Chrome; owns extension lifecycle and user entry points.
- **RESPONSIBILITY:** Load/unload, extension UI, wiring user tasks into the agent.
- **INPUTS:** User task; extension lifecycle events.
- **OUTPUTS:** Task request; launches agent context.
- **DEPENDENCIES:** Chrome extension APIs. (No internal module dependencies.)
- **PUBLIC INTERFACE:** IF-TASK (task intake).
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** extension manifest, entry points, UI, shell wiring.
- **FORBIDDEN FILES:** anything under any other module's allowed-file scope.
- **TEST STRATEGY:** Extension smoke tests; task-intake tests.
- **STATUS:** PLANNED

### M02 — Observation Engine
- **PURPOSE:** Capture the current browser state on demand.
- **RESPONSIBILITY:** Screenshot capture + DOM/A11y extraction.
- **INPUTS:** Observation request.
- **OUTPUTS:** Raw observation (screenshot reference + DOM/A11y snapshot).
- **DEPENDENCIES:** M01, Chrome extension APIs.
- **PUBLIC INTERFACE:** IF-OBS.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** observation capture, DOM/A11y extraction.
- **FORBIDDEN FILES:** other modules' scopes; never persistence of raw data to any transmittable store.
- **TEST STRATEGY:** Capture unit tests; failure-observation tests.
- **STATUS:** PLANNED

### M03 — Local Visual Perception
- **PURPOSE:** Run ShowUI-2B locally to produce visual grounding.
- **RESPONSIBILITY:** On-device inference over the screenshot.
- **INPUTS:** Raw screenshot (local only).
- **OUTPUTS:** Visual grounding result.
- **DEPENDENCIES:** M02; local model runtime [UNKNOWN].
- **PUBLIC INTERFACE:** IF-PERCEPTION.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** model adapter, inference orchestration.
- **FORBIDDEN FILES:** network egress of the screenshot or grounding output.
- **TEST STRATEGY:** Inference unit tests; failure tests (scenario 5).
- **STATUS:** PLANNED

### M04 — Perception Fusion
- **PURPOSE:** Combine visual + structural evidence into one fused result.
- **RESPONSIBILITY:** Fuse sources with confidence/provenance; never drop sensitive-region evidence.
- **INPUTS:** Visual grounding result; DOM/A11y snapshot; optional OCR.
- **OUTPUTS:** Fused perception result.
- **DEPENDENCIES:** M03, M02.
- **PUBLIC INTERFACE:** IF-FUSION.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** fusion logic, confidence/provenance model.
- **FORBIDDEN FILES:** privacy decisions, redaction, network egress.
- **TEST STRATEGY:** Fusion unit tests; UNKNOWN-preservation tests (PRIV-006).
- **STATUS:** PLANNED

### M05 — Privacy Engine
- **PURPOSE:** Sole local authority determining what may cross the network boundary.
- **RESPONSIBILITY:** Sensitive-content detection (DOM + visual paths), sanitization, redaction verification.
- **INPUTS:** Fused perception result.
- **OUTPUTS:** Verified sanitized observation.
- **DEPENDENCIES:** M04.
- **PUBLIC INTERFACE:** IF-PRIV-DETECT, IF-SANITIZE, IF-VERIFY.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** detection rules, redaction, verification.
- **FORBIDDEN FILES:** anything that bypasses the fail-closed gate; network egress.
- **TEST STRATEGY:** Privacy-test suite (`docs/privacy/PRIVACY-TESTING.md`).
- **STATUS:** PLANNED

### M06 — Sanitized Context Builder
- **PURPOSE:** Build the only outbound payload allowed to cross the network boundary.
- **RESPONSIBILITY:** Serialize verified sanitized observation into the sanitized-context schema.
- **INPUTS:** Verified sanitized observation.
- **OUTPUTS:** Sanitized context.
- **DEPENDENCIES:** M05.
- **PUBLIC INTERFACE:** IF-CONTEXT.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** context serialization, schema validation.
- **FORBIDDEN FILES:** raw data access; bypass of verification.
- **TEST STRATEGY:** Payload-inspection tests; schema-invariant tests.
- **STATUS:** PLANNED

### M07 — Reasoning Gateway
- **PURPOSE:** Transport sanitized context to the cloud reasoning model and receive proposals.
- **RESPONSIBILITY:** Single network egress+ingress point; parse model response into structured proposal.
- **INPUTS:** Sanitized context.
- **OUTPUTS:** Structured action proposal (unvalidated).
- **DEPENDENCIES:** M06.
- **PUBLIC INTERFACE:** IF-REASON, IF-ACTION.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** transport client, proposal parsing.
- **FORBIDDEN FILES:** raw perception/observation data; execution authority.
- **TEST STRATEGY:** Transport tests; malformed-response tests (scenario 6).
- **STATUS:** PLANNED

### M08 — Local Action Guard
- **PURPOSE:** Sole local authority permitting execution (PRIV-005).
- **RESPONSIBILITY:** Validate schema, staleness, authorization of each proposal.
- **INPUTS:** Action proposal; current observation/state.
- **OUTPUTS:** Validated action or rejection.
- **DEPENDENCIES:** M07, M02, M10.
- **PUBLIC INTERFACE:** IF-VALIDATE.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** validation rules, staleness checks.
- **FORBIDDEN FILES:** actual browser mutation; network egress.
- **TEST STRATEGY:** Validation tests (scenarios 6, 7); dangerous-action tests.
- **STATUS:** PLANNED

### M09 — Browser Executor
- **PURPOSE:** Execute validated actions against the live browser, then trigger re-observation.
- **RESPONSIBILITY:** Re-check state before acting; execute; hand off to re-observation.
- **INPUTS:** Validated action.
- **OUTPUTS:** Execution result.
- **DEPENDENCIES:** M08, M01, Chrome extension APIs.
- **PUBLIC INTERFACE:** IF-EXEC.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** action execution, pre-execution state check.
- **FORBIDDEN FILES:** unvalidated cloud output handling; privacy decisions.
- **TEST STRATEGY:** Browser-action tests (scenarios 7, 9).
- **STATUS:** PLANNED

### M10 — Agent State / Orchestration
- **PURPOSE:** Manage the loop's state machine and task state.
- **RESPONSIBILITY:** Trigger stages; hold state; route failures; verify completion.
- **INPUTS:** Signals from all stages.
- **OUTPUTS:** State transitions; observation triggers; verification result.
- **DEPENDENCIES:** All modules.
- **PUBLIC INTERFACE:** IF-VERIFY-CLOOP, state API.
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** state machine, task state, orchestration logic.
- **FORBIDDEN FILES:** no retention of raw pre-sanitization data in transmittable form.
- **TEST STRATEGY:** State-machine tests; verification tests (scenario 10).
- **STATUS:** PLANNED

### M11 — Validation / Test Harness
- **PURPOSE:** Test-only harness for unit/integration/privacy testing.
- **RESPONSIBILITY:** Provide fake reasoning service, fixture pages, payload interceptor.
- **INPUTS:** Tests to run; fixtures.
- **OUTPUTS:** Test results and evidence.
- **DEPENDENCIES:** M01–M10 (test-only).
- **PUBLIC INTERFACE:** N/A (test infra).
- **OWNERSHIP:** [UNKNOWN]
- **ALLOWED FILES:** test fixtures, harness code, fake services.
- **FORBIDDEN FILES:** production runtime code; real credentials/secrets in fixtures.
- **TEST STRATEGY:** N/A (this is the harness).
- **STATUS:** PLANNED

## Ownership

Owners are [UNKNOWN] until employee allocation (Phase 6). See `docs/employees/EMPLOYEE-TEMPLATE.md`. Do not invent names.

## V1 Status

All modules are PLANNED (required for V1). No module is frozen; no module is implemented.