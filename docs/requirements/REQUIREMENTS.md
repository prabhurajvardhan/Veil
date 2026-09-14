# VEIL — Requirements

Status: DRAFT — Requirements Freeze not yet performed. See `docs/freezes/REQUIREMENTS.md`.
Every requirement ID traces to implementation, test, and evidence per `docs/engineering/TRACEABILITY.md`.

## 0. Source of Truth

The following are CONFIRMED from the project brief and preserved; nothing below was invented.

- One-line product definition: "VEIL lets AI use your browser to complete tasks while keeping sensitive screen information private."
- The core loop: user task → browser observation → local visual perception (ShowUI-2B) → perception fusion → privacy detection → sanitization → sanitized context → cloud reasoning → structured action proposal → local action validation → browser execution → re-observation → verification.
- Eight privacy principles (see §3.1).
- V1 technical priority: a single working end-to-end loop for one task at a time.
- Anti-scope-creep: advanced features must not delay the working loop.
- Context: VEIL is being built for SIH26171 — "On-device Vision for Browser Agents". No SIH-specific requirement text was provided in the brief. No SIH requirement is invented here; SIH mapping is in `docs/engineering/TRACEABILITY.md`.

## 1. Product Definition & Scope

### 1.1 Product
VEIL is an **AI-powered Chrome browser extension / browser agent** [CONFIRMED: Chrome extension is the V1 deployment target]. It completes tasks in the user's browser while keeping sensitive screen information private.

### 1.2 Target User
[ASSUMPTION] A user who wants an AI agent to complete multi-step browser tasks without exposing sensitive on-screen content (passwords, PII, financial data) to the cloud model performing reasoning.

### 1.3 V1 In-Scope (CONFIRMED)
- Full loop processing for one task at a time.
- Local visual grounding via ShowUI-2B.
- Local privacy detection and sanitization prior to any network transmission.
- Structured (not prose) sanitized context sent to the cloud reasoning model.
- Local validation of every proposed action prior to execution.

### 1.4 V1 Out of Scope (CONFIRMED / FUTURE)
- Adaptive inference / dynamic model selection.
- Advanced token reduction strategies.
- Sophisticated perception policies beyond V1's loop.
- Multi-model routing.
- Advanced reconstruction-attack defense research.
- Research-grade optimization.

## 2. Functional Requirements

CONFIRMED, derived from the core loop. Each requirement has an ID for traceability.

- **REQ-001** — The user can provide a task in natural language.
- **REQ-002** — The system captures a browser observation (screenshot and/or DOM/accessibility tree) from the live browser.
- **REQ-003** — The system performs local visual understanding of the observation using ShowUI-2B.
- **REQ-004** — The system fuses visual and structural (DOM/A11y) evidence into a single perception result.
- **REQ-005** — The system detects sensitive information in the fused perception before any network transmission.
- **REQ-006** — The system sanitizes (redacts/transforms) detected sensitive information.
- **REQ-007** — Only sanitized context is sent to the cloud reasoning model.
- **REQ-008** — The system receives a structured action proposal from the cloud reasoning model.
- **REQ-009** — The system locally validates the proposed action before execution.
- **REQ-010** — The system executes validated actions in the browser.
- **REQ-011** — The system re-observes the browser after execution.
- **REQ-012** — The system verifies whether the task/action succeeded after re-observation.

## 3. Non-Functional Requirements

### 3.1 Privacy Requirements (CONFIRMED from brief)
- **PRIV-001** — Raw sensitive visual data must not be unnecessarily transmitted.
- **PRIV-002** — Privacy enforcement happens before the network boundary.
- **PRIV-003** — Cloud reasoning does not receive unrestricted screen access.
- **PRIV-004** — The cloud proposes actions; it does not receive execution authority.
- **PRIV-005** — Local validation is mandatory before browser execution.
- **PRIV-006** — Unknown information must remain unknown (never coerced to "not observed" or "false").
- **PRIV-007** — Privacy uncertainty must fail closed.
- **PRIV-008** — Reduced local compute must reduce capability, not reduce privacy.

### 3.2 Security Requirements
- **SEC-001** [PROPOSED] Network transport across the privacy boundary must be authenticated and encrypted.
- **SEC-002** [PROPOSED] Data crossing from the cloud (action proposals) is treated as untrusted input until locally validated.
- [UNKNOWN] Threat model / adversary assumptions — not yet specified.

### 3.3 Browser / Extension Requirements
- **REQ-013** [CONFIRMED] VEIL is a Chrome browser extension.
- [UNKNOWN] Target Chrome version(s), supported platforms/OS — not specified.
- [UNKNOWN] Extension permission model / required permissions — not specified.

### 3.4 Local Inference Requirements
- **REQ-014** [CONFIRMED] Local visual grounding must run via ShowUI-2B.
- [UNKNOWN] Hardware/runtime requirements to run ShowUI-2B locally — do not invent RAM/latency figures.

### 3.5 Agent Requirements
- **REQ-015** [CONFIRMED] The agent follows a closed loop: observe → act → re-observe → verify.
- **REQ-016** [CONFIRMED] The agent manages task state across loop iterations.

### 3.6 Action Execution Requirements (CONFIRMED)
- **REQ-017** — Every proposed action must pass local validation before execution.
- **REQ-018** — Execution must be followed by re-observation and verification.

### 3.7 Validation Requirements
- **REQ-019** [CONFIRMED] Action proposals must be validated against schema, staleness, and authorization rules before execution.
- [UNKNOWN] Staleness-detection mechanism — not yet defined.

### 3.8 Remaining Non-Functional Requirements
- [UNKNOWN] Latency budget, throughput, resource ceilings (RAM/CPU), offline behavior — VALIDATION REQUIRED.
- [UNKNOWN] Observability — logging, telemetry, and audit requirements, and what may be logged given privacy constraints — VALIDATION REQUIRED.

## 4. V1 Acceptance (CONFIRMED minimum scenario list from brief)

1. Normal browser task.
2. Sensitive information visible.
3. Password field visible.
4. PII visible.
5. Local perception uncertainty.
6. Cloud proposes invalid action.
7. Page changes before execution.
8. Model/runtime unavailable.
9. Browser action failure.
10. Re-observation after action.

Concrete test steps and pass/fail criteria: [UNKNOWN] — must be written once system-design schemas stop being draft. See `docs/privacy/PRIVACY-TESTING.md` and `docs/engineering/QUALITY.md`.

## 5. Future Requirements (PROPOSED / FUTURE — not gating V1)
- Multi-model routing / dynamic model selection.
- Advanced token reduction.
- Adaptive inference.
- Broader browser/OS coverage.
- Multiple reasoning-model backends.

## 6. Out of Scope
- General-purpose screen recording / screen sharing.
- Granting the cloud reasoning model execution authority.
- Treating "unknown" sensitivity as "safe to send".
- Research-grade reconstruction-attack defense for V1.

## 7. Explicit Unknowns
- Target Chrome version(s) and OS(es).
- Cloud reasoning model/provider.
- Performance/latency targets.
- Hardware requirements for local ShowUI-2B inference.
- Staleness-detection mechanism.
- Extension permission model.
- SIH-specific requirement text (referenced in the brief but not provided) — do not fabricate.