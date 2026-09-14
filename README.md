# VEIL

**One-line definition (CONFIRMED):** "VEIL lets AI use your browser to complete tasks while keeping sensitive screen information private."

## What VEIL Is

VEIL is an AI-powered Chrome browser extension / browser agent [CONFIRMED scope: Chrome extension backend for V1]. A user states a task; VEIL observes the browser, understands the page locally, keeps sensitive content on-device, asks a cloud reasoning model to propose the next action, validates the proposal locally, executes it, and re-observes to verify — repeating until the task is complete.

## The Problem

AI browser agents need page context to act, but sending raw screenshots or raw DOM dumps to a cloud model exposes sensitive information (credentials, PII, financial data, private messages) that the model does not need to decide the next action.

VEIL's answer: **raw browser data stays on the user's device** unless the privacy architecture explicitly permits it to leave. The cloud receives only the minimum sanitized context required for reasoning. The cloud proposes actions; the local extension validates and executes them.

## Who It Is For

A user who wants an AI agent to complete multi-step browser tasks (form filling, navigation, data lookup, workflow automation) without exposing sensitive on-screen content to the cloud model. [ASSUMPTION — not yet validated against a specific persona.]

## What V1 Does

V1 is one working end-to-end loop for one task at a time:

```
User Task → Browser Observation → Local Visual Perception (ShowUI-2B) →
Perception Fusion → Privacy Detection → Sanitization → Sanitized Context →
Cloud Reasoning → Structured Action Proposal → Local Action Validation →
Browser Execution → Re-observation → Verification
```

Anything not required for this loop does not block V1. (See `docs/requirements/REQUIREMENTS.md`.)

## Core Privacy Principle

```
RAW BROWSER DATA REMAINS ON THE USER'S DEVICE
unless explicitly permitted by the privacy architecture.
```

The cloud receives only minimum sanitized context. The cloud proposes; the local extension validates and executes. See `docs/privacy/PRIVACY-BOUNDARY.md`.

## Current Development Stage

- **Phase:** Phase 1 — Requirements (drafted, **NOT frozen**). See `docs/engineering/WORKFLOW.md`.
- **Freezes:** None. Requirements, Architecture, System Design, and Modules are all **NOT FROZEN**. See `docs/freezes/`.
- **Implementation:** None. All schemas and designs are PROPOSED/DRAFT. Do not start implementation ahead of the freeze sequence.

## Repository Structure

```
README.md            ← this file (operational entry point)
STATUS.md            ← single current-project status source
TASKS.md             ← task registry (authoritative)
MODULES.md           ← module registry (authoritative)
INTERFACES.md        ← interface contracts between modules
DECISIONS.md         ← architecture decision records (ADRs)
docs/
  requirements/REQUIREMENTS.md
  architecture/ARCHITECTURE.md
  architecture/DEPENDENCIES.md
  system-design/SYSTEM-DESIGN.md
  privacy/PRIVACY-BOUNDARY.md
  privacy/PRIVACY-TESTING.md
  agent/AGENT-LOOP.md
  agent/STATE-MACHINE.md
  agent/ACTION-PROTOCOL.md
  perception/LOCAL-PERCEPTION.md
  perception/SHOWUI.md
  perception/PERCEPTION-FUSION.md
  engineering/WORKFLOW.md
  engineering/GIT-STRATEGY.md
  engineering/TRACEABILITY.md
  engineering/QUALITY.md
  employees/EMPLOYEE-TEMPLATE.md   (assignments only when employees are allocated)
  freezes/REQUIREMENTS.md
  freezes/ARCHITECTURE.md
  freezes/SYSTEM-DESIGN.md
  freezes/MODULES.md
src/
  README.md          ← implementation boundary gate + planned module layout
```

## Engineering Workflow

VEIL follows a defined engineering delivery lifecycle: requirements → architecture → system design → modules → tasks → employee allocation → implementation → integration → validation → release. Each phase goes DEFINE → REVIEW → VALIDATE → FREEZE before the next begins.

- Phase order and rules: `docs/engineering/WORKFLOW.md`
- Git/PR/discipline: `docs/engineering/GIT-STRATEGY.md`
- Traceability matrix: `docs/engineering/TRACEABILITY.md`
- Quality/testing: `docs/engineering/QUALITY.md`

## Mandatory Worker Startup Procedure

Every AI coding employee (and human engineer) starts work like this:

1. Read `README.md` (this file).
2. Read `STATUS.md`.
3. Read `docs/requirements/REQUIREMENTS.md`.
4. Read `docs/architecture/ARCHITECTURE.md`.
5. Read `MODULES.md`.
6. Read `INTERFACES.md`.
7. Read `DECISIONS.md`.
8. Read your assigned employee file (in `docs/employees/`, if allocated).
9. Read your assigned task (in `TASKS.md`).
10. Verify dependencies (see your task and `docs/architecture/DEPENDENCIES.md`).
11. Work only inside your assigned boundary.
12. Run required validation (see your task's VALIDATION field and `docs/engineering/QUALITY.md`).
13. Update status (`STATUS.md` and `TASKS.md`).
14. Submit for review (PR per `docs/engineering/GIT-STRATEGY.md`).

## Where Things Live (index)

| Concern | Location |
|---|---|
| Product definition, vision, scope | `docs/requirements/REQUIREMENTS.md` (§1–§2) |
| Requirements | `docs/requirements/REQUIREMENTS.md` |
| Architecture | `docs/architecture/ARCHITECTURE.md` |
| Dependency graph | `docs/architecture/DEPENDENCIES.md` |
| System design | `docs/system-design/SYSTEM-DESIGN.md` |
| Privacy boundary | `docs/privacy/PRIVACY-BOUNDARY.md` |
| Privacy testing | `docs/privacy/PRIVACY-TESTING.md` |
| Agent loop | `docs/agent/AGENT-LOOP.md` |
| State machine | `docs/agent/STATE-MACHINE.md` |
| Action protocol | `docs/agent/ACTION-PROTOCOL.md` |
| Modules | `MODULES.md` |
| Interfaces/contracts | `INTERFACES.md` |
| Decisions (ADRs) | `DECISIONS.md` |
| Tasks | `TASKS.md` |
| Status | `STATUS.md` |
| Freezes | `docs/freezes/` |
| Employees | `docs/employees/` |

## Labeling Convention

Every technical statement in this repository is labeled:

- **CONFIRMED** — stated in the project brief or verified directly.
- **PROPOSED** — an engineering decision being suggested, not yet agreed/validated.
- **ASSUMPTION** — a temporary assumption made to keep work moving.
- **UNKNOWN** / **VALIDATION REQUIRED** — not yet established.

Nothing is a fact just because it is written down. Do not write `CONFIRMED` for something you cannot trace to the brief or to direct inspection.