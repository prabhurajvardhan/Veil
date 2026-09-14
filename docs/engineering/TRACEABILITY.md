# VEIL — Traceability

Status: DRAFT (matrix skeleton; evidence columns empty until implementation and tests exist).

## 1. Purpose

Every important requirement must trace: REQUIREMENT → ARCHITECTURE → MODULE → INTERFACE → TASK → IMPLEMENTATION → TEST → EVIDENCE.
Especially important for SIH26171: the documentation must map the solution to the actual problem statement and prevent VEIL from becoming "another browser automation agent with a privacy label."

## 2. SIH26171 Context

VEIL is being built for **SIH26171 — "On-device Vision for Browser Agents"** [CONFIRMED from the project context]. The problem statement requires demonstrating: local visual understanding, actual privacy enforcement before network transmission, meaningful sanitized context, browser action execution, and resource/latency and privacy evaluation.
No SIH-specific requirement text beyond the title was provided in the project brief. **No SIH requirement is invented here.** The table below maps SIH themes (explicitly labeled) to VEIL responses.

## 3. SIH Theme → VEIL Response → Implementation → Test → Evidence

| SIH theme (from problem title) | VEIL response | Implementation | Test | Evidence |
|---|---|---|---|---|
| On-device vision | Local ShowUI-2B visual grounding (M03, REQ-003, REQ-014) | [PENDING — after implementation] | Local-perception test (acceptance scenario 5) | [EMPTY — no result claimed] |
| Privacy enforcement before network transmission | Privacy engine runs detection+sanitization+verification before network egress (M05/M06; PRIV-001/002; REQ-005-007) | [PENDING] | Privacy tests (payload inspection, fail-closed) — `docs/privacy/PRIVACY-TESTING.md` | [EMPTY] |
| Meaningful sanitized context | Structured sanitized context, the only outbound payload (M06/M07; REQ-007; ADR-007/008) | [PENDING] | Cloud payload inspection; end-to-end sampling (acceptance scenario 2–4) | [EMPTY] |
| Browser action execution | Local action guard + executor (M08/M09; REQ-008-010; PRIV-004/005) | [PENDING] | Action-protocol tests (acceptance scenarios 6, 7, 9) | [EMPTY] |
| Resource/latency evaluation | Latency and resource measurement during local inference [UNKNOWN thresholds — to be defined; REQ: NFR-UNKNOWN] | [PENDING] | Performance testing (`docs/engineering/QUALITY.md`) | [EMPTY] |
| Privacy evaluation | Privacy test suite (leakage, redaction, reconstruction risk where practical) | [PENDING] | `docs/privacy/PRIVACY-TESTING.md` | [EMPTY] |

## 4. Requirement → Module → Interface → Task → Test Matrix

| REQ | Module(s) | Interface(s) | Task | Test | Evidence |
|---|---|---|---|---|---|
| REQ-001 | M10/M01 | IF-TASK | [TBD] | Acceptance 1 | [EMPTY] |
| REQ-002 | M02 | IF-OBS | [TBD] | Acceptance 1,10 | [EMPTY] |
| REQ-003 | M03 | IF-PERCEPTION | [TBD] | Acceptance 5 | [EMPTY] |
| REQ-004 | M04 | IF-FUSION | [TBD] | Unit (fusion) | [EMPTY] |
| REQ-005 | M05 | IF-PRIV-DETECT | [TBD] | Privacy tests | [EMPTY] |
| REQ-006 | M05 | IF-SANITIZE | [TBD] | Privacy tests | [EMPTY] |
| REQ-007 | M06/M07 | IF-CONTEXT | [TBD] | Payload inspection | [EMPTY] |
| REQ-008 | M07 | IF-ACTION | [TBD] | Acceptance 6 | [EMPTY] |
| REQ-009 | M08 | IF-VALIDATE | [TBD] | Acceptance 6,7 | [EMPTY] |
| REQ-010 | M09 | IF-EXEC | [TBD] | Acceptance 7,9 | [EMPTY] |
| REQ-011 | M02/M10 | IF-OBS | [TBD] | Acceptance 10 | [EMPTY] |
| REQ-012 | M10 | IF-VERIFY-CLOOP | [TBD] | Verification tests | [EMPTY] |
| REQ-013 | M01 | — | [TBD] | Extension smoke test | [EMPTY] |
| REQ-014 | M03 | IF-PERCEPTION | [TBD] | Local-perception test | [EMPTY] |
| REQ-015 | M10 | — | [TBD] | Acceptance 10 | [EMPTY] |
| REQ-016 | M10 | — | [TBD] | State-machine tests | [EMPTY] |
| REQ-017 | M08 | IF-VALIDATE | [TBD] | Acceptance 6 | [EMPTY] |
| REQ-018 | M09/M10 | IF-EXEC/IF-VERIFY-CLOOP | [TBD] | Acceptance 10 | [EMPTY] |
| REQ-019 | M08 | IF-VALIDATE | [TBD] | Validation tests | [EMPTY] |
| PRIV-001 | M05 | IF-PRIV-DETECT | [TBD] | Payload inspection | [EMPTY] |
| PRIV-002 | M05/M06 | IF-VERIFY/IF-CONTEXT | [TBD] | Payload inspection | [EMPTY] |
| PRIV-003 | M06 | IF-CONTEXT | [TBD] | Payload inspection | [EMPTY] |
| PRIV-004 | M08 | IF-VALIDATE | [TBD] | Action-protocol tests | [EMPTY] |
| PRIV-005 | M08 | IF-VALIDATE | [TBD] | Acceptance 6 | [EMPTY] |
| PRIV-006 | M04/M05 | IF-FUSION | [TBD] | Fusion unit tests | [EMPTY] |
| PRIV-007 | M05 | IF-PRIV-DETECT | [TBD] | Fail-closed tests | [EMPTY] |
| PRIV-008 | M03/M05 | — | [TBD] | Capability-vs-privacy tests | [EMPTY] |

Columns "Task", "Test" enter values once TASKS.md and tests exist; "Evidence" only ever records actually-run results. Nothing is claimed before evidence exists.

## 5. Anti-"privacy-washing" Guardrails

The project must demonstrate (no numerical results invented; all pending actual measurement):
1. Local visual understanding actually runs on-device (not cloud vision).
2. Privacy enforcement occurs before network transmission (payload inspection proves it).
3. Sanitized context is meaningful enough for reasoning (end-to-end task success).
4. Browser actions execute with local validation (action protocol).
5. Resource/latency and privacy evaluation reports are filled from measurements, not estimates.