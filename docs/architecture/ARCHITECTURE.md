# VEIL — Architecture

Status: DRAFT (V0, not frozen). See `docs/freezes/ARCHITECTURE.md`.

## 0. Axioms

- **CONFIRMED** (from brief): Raw browser data must remain on the user's device unless explicitly permitted by the privacy architecture.
- **CONFIRMED** (from brief): The cloud receives only the minimum sanitized context required for reasoning.
- **CONFIRMED** (from brief): The cloud proposes actions; the local extension validates and executes them.

## 1. Architectural Principle

Three authority classes are explicitly separated, and this separation is the core invariant of the architecture:

| Authority | Holder | May |
|---|---|---|
| **PERCEPTION** | Local (extension + on-device runtime) | Observe and interpret the page locally |
| **REASONING** | Remote (cloud reasoning model) | Propose the next action from sanitized context only |
| **EXECUTION AUTHORITY** | Local (action guard) | Authorize and execute actions in the browser |

The cloud never holds perception authority over raw data and never holds execution authority.

## 2. LOCAL vs REMOTE

```
LOCAL (on user's device)                    REMOTE (cloud)
-----------------------------------          ------------------------
Chrome Extension (shell)                     Cloud Reasoning Service
Observation Engine                           - receives sanitized context
Local Visual Perception (ShowUI-2B)          - returns structured action proposals
Perception Fusion
Privacy Engine (detection, sanitization,
  redaction verification)
Sanitized Context Builder
Local Action Guard
Browser Executor
Agent State / Orchestration
```

**What may cross the boundary OUTBOUND:** only sanitized context (see PRIV-002, PRIV-003).
**What may cross INBOUND:** only structured action proposals, treated as untrusted until validated (SEC-002).
**Everything else:** stays on-device.

## 3. Components

For each component: purpose, responsibility, inputs, outputs, dependencies, trust level, privacy boundary, failure behavior, owner.

### 3.1 User (Actor)
- Purpose: states the task the agent must complete.
- Inputs: natural-language task string.
- Outputs: task goal to the agent.
- Trust level: user-provided input; untrusted until parsed.
- Privacy: the task text itself may contain sensitive information [UNKNOWN whether in-scope for sanitization — VALIDATION REQUIRED].
- Owner: n/a.

### 3.2 Chrome Extension (Shell) [CONFIRMED deployment target]
- Purpose: hosts VEIL in the browser; integration point with the user and the page.
- Responsibility: load/unload the agent, expose UI, own the extension lifecycle.
- Inputs: user task; extension lifecycle events.
- Outputs: task request; launched agent process/context.
- Dependencies: Chrome extension APIs.
- Trust level: local boundary; privileged extension context.
- Privacy: extension code runs in the browser and never sends raw page data.
- Failure behavior: [UNKNOWN — VALIDATION REQUIRED].
- Owner: M01.

### 3.3 Observation Layer
- Purpose: capture the current browser state on demand.
- Responsibility: acquire a screenshot and/or DOM/accessibility-tree snapshot.
- Inputs: observation trigger from the state machine.
- Outputs: raw observation (screenshot reference + DOM/A11y snapshot).
- Dependencies: Chrome extension APIs.
- Trust level: local boundary; raw and unsanitized.
- Privacy: raw observation must never cross the network boundary.
- Failure behavior: capture failure (e.g., permission denied, page not ready) must produce an explicit failure observation, not a silently empty one [PROPOSED].
- Owner: M02.

### 3.4 Local Visual Perception (ShowUI-2B)
- Purpose: run ShowUI-2B locally to produce visual grounding.
- Responsibility: interpret the screenshot entirely on-device (element locations/semantic labels).
- Inputs: raw screenshot (local only).
- Outputs: visual grounding result.
- Dependencies: M02; local model runtime [UNKNOWN].
- Trust level: local boundary.
- Privacy: ShowUI-2B input (screenshot) must never leave the device.
- Failure behavior: [UNKNOWN — model failure/timeout — VALIDATION REQUIRED].
- Owner: M03.

### 3.5 Perception Fusion
- Purpose: combine visual grounding with DOM/A11y evidence into one structured perception result.
- Responsibility: reconcile evidence with confidence and provenance; never silently drop evidence about potentially sensitive regions.
- Inputs: visual grounding result; DOM/A11y snapshot; optional OCR.
- Outputs: fused perception result (structured elements with type, location, label, confidence, provenance).
- Dependencies: M03, M02.
- Trust level: local boundary.
- Privacy: fused result is the direct input to privacy detection; information lost/mislabeled here can cause a downstream privacy miss.
- Failure behavior: conflicting evidence → mark affected elements low-confidence/UNKNOWN rather than arbitrarily choosing [PROPOSED].
- Owner: M04.

### 3.6 Privacy Engine (Detection & Sanitization)
- Purpose: sole local authority determining what may cross the network boundary.
- Responsibility: detect sensitive content (DOM-based and visual paths), sanitize it, and verify the result before transmission.
- Inputs: fused perception result.
- Outputs: sanitized observation (verified free of detected sensitive content).
- Dependencies: M04.
- Trust level: local boundary; privacy-critical.
- Privacy: implements PRIV-001, PRIV-002, PRIV-006, PRIV-007, PRIV-008. Uncertainty fails closed — never expose more data on uncertainty.
- Failure behavior: sanitization failure or verification failure → block transmission (fail closed).
- Owner: M05.

### 3.7 Sanitized Context
- Purpose: the only data structure permitted to cross the network boundary toward the cloud.
- Responsibility: serialize the verified sanitized observation into the sanitized-context schema.
- Inputs: verified sanitized observation.
- Outputs: sanitized context (structured, field-level).
- Dependencies: M05.
- Trust level: boundary artifact between local and network.
- Privacy: no field may contain content that failed sanitization/verification.
- Failure behavior: if the sanitized-context builder cannot guarantee clean content, it must not produce output [PROPOSED].
- Owner: M06.

### 3.8 Reasoning Service (Cloud)
- Purpose: propose the next action toward the user's task.
- Responsibility: reason over sanitized context and return a structured action proposal.
- Inputs: sanitized context (only).
- Outputs: structured action proposal.
- Dependencies: none locally.
- Trust level: REMOTE; untrusted until validated. NO execution authority.
- Privacy: receives only sanitized context; no raw screen data (PRIV-003, ADR-008).
- Failure behavior: network/timeout/model unavailable → agent surfaces a clear failure state rather than proceeding with a stale/guessed action [PROPOSED].
- Owner: M07 (gateway client).

### 3.9 Local Action Guard (Validation)
- Purpose: sole local authority permitting execution of a proposed action (PRIV-005).
- Responsibility: validate schema, staleness, and authorization of each proposed action.
- Inputs: action proposal; current observation/state.
- Outputs: validated action (or rejection).
- Dependencies: M07, M02, M10.
- Trust level: local boundary; execution-authority gate.
- Privacy: an invalid, stale, or unauthorized proposal must not execute.
- Failure behavior: rejection is the required behavior; never execute on uncertain validation [CONFIRMED].
- Owner: M08.

### 3.10 Browser Executor
- Purpose: execute validated actions against the live browser.
- Inputs: validated action.
- Outputs: execution result; triggers re-observation.
- Dependencies: M08, Chrome extension APIs.
- Trust level: local boundary; execution boundary.
- Privacy: executes only validated actions; never acts on unvalidated cloud output.
- Failure behavior: execution re-checks target/page state immediately before acting to narrow the stale window [PROPOSED]. Browser-level failures [UNKNOWN — VALIDATION REQUIRED].
- Owner: M09.

### 3.11 Re-observation / Verification
- Purpose: close the loop — after every execution, re-observe and verify whether the action/task succeeded.
- Inputs: execution result.
- Outputs: verification result (success/failure/continue).
- Dependencies: M02, M10.
- Trust level: local boundary.
- Privacy: re-observation restarts the pipeline from the top; the same privacy handling applies again.
- Failure behavior: [UNKNOWN — VALIDATION REQUIRED, see acceptance scenario 10].
- Owner: M10 (orchestration).

### 3.12 Agent State / Orchestration
- Purpose: manage the loop's state machine and carry task state across iterations.
- Responsibility: trigger stages, hold current task/observation references, route failures.
- Inputs: signals from all stages.
- Outputs: stage transitions, observation triggers.
- Dependencies: all modules.
- Trust level: local boundary.
- Privacy: no raw pre-sanitization sensitive data may be retained in persistent agent state that could later be transmitted [CONFIRMED].
- Failure behavior: defined by the state machine — see `docs/agent/STATE-MACHINE.md`.
- Owner: M10.

## 4. Boundaries (CONFIRMED boundary set from brief)

| Boundary | Crossed by |
|---|---|
| Browser boundary | Observation capture (in) and action execution (out) |
| Local runtime boundary | Encloses all on-device processing |
| Privacy boundary | Last point before the network at which sanitization must have occurred |
| Network boundary | Outbound sanitized context; inbound action proposals. Only sanitized structured data may cross |
| Cloud reasoning boundary | Sanitized context in; proposals out. No other access |
| Execution boundary | Crossed only after local validation succeeds |

## 5. Trust Boundaries (from `01-architecture/trust-boundaries.md`, preserved)

- Browser: trusted to reflect page state and execute UI actions; NOT trusted to self-report sensitivity.
- Local perception: trusted to produce grounding; NOT trusted to make privacy decisions or be sole truth about page state.
- Privacy engine: trusted as sole gate; NOT trusted to pass through uncertain content — fails closed (PRIV-007).
- Cloud reasoning: trusted to propose the next action; NOT trusted to receive raw data or execute (PRIV-004).
- Local action validator: trusted as sole execution-authority gate; NOT trusted to approve actions against stale/unverified state.
- Execution layer: trusted to execute only validated actions; NOT trusted to execute cloud proposals directly.

## 6. Open Questions (not invented)

- [UNKNOWN] Process/sandbox isolation model for the local runtime.
- [UNKNOWN] Transport mechanism/protocol across the network boundary.
- [UNKNOWN] Formal threat model / adversary assumptions.

## 7. Traceability

Architecture components cover requirements: REQ-001…REQ-019 and PRIV-001…PRIV-008. Full matrix in `docs/engineering/TRACEABILITY.md`.