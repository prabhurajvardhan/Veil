# VEIL — Architecture

## Overview
CONFIRMED core loop (from brief):

```
Browser
  → Observation
  → Local Visual Understanding (ShowUI-2B)
  → Perception Fusion (visual + DOM/A11y)
  → Privacy Detection & Sanitization
  → Sanitized Context
  → Cloud Reasoning
  → Action Proposal
  → Local Action Validation
  → Browser Execution
  → Re-observation
  → Verification
```

## Component Responsibilities and Boundaries

### Browser
CONFIRMED: Source of observations (screenshots, DOM/A11y tree) and target of executed actions. UNKNOWN which specific browser(s) — see `00-project/requirements.md`.

### Observation
CONFIRMED: Captures the current browser state (screenshot and/or DOM/A11y snapshot) on demand, triggered by the agent state machine (see `04-state/state-machine.md`).

### Local Visual Understanding
CONFIRMED: Runs ShowUI-2B locally to produce visual grounding (e.g., element locations, semantic labels) from the observation. Runs entirely on-device — no raw screenshot leaves this boundary. See `03-concepts/showui.md`.

### Perception Fusion
CONFIRMED (named component in brief): Combines visual grounding output with DOM/A11y evidence into a single fused perception result, including confidence and provenance. See `02-system-design/perception/perception-fusion.md`.

### Privacy Engine (Detection & Sanitization)
CONFIRMED: Inspects the fused perception result for sensitive information and redacts/transforms it before any data may cross the network boundary. Operates entirely locally, before the network boundary (Privacy Principle #2). See `02-system-design/privacy/`.

### Sanitized Context
CONFIRMED: The only data structure permitted to cross the network boundary to the cloud reasoning model. Structured, not raw. See `02-system-design/reasoning/context-contract.md`.

### Cloud Reasoning
CONFIRMED: Receives sanitized context, proposes the next action. Has NO execution authority (Privacy Principle #4). UNKNOWN which model/provider.

### Action Proposal / Local Action Validation
CONFIRMED: The cloud's output is a structured action proposal, not raw text. A local validator checks the proposal (e.g., against current page state, schema, staleness) before it may execute. See `02-system-design/execution/`.

### Browser Execution
CONFIRMED: Executes only validated actions against the live browser.

### Re-observation / Verification
CONFIRMED: After execution, the loop re-observes the browser and verifies whether the action/task succeeded, closing the loop.

## Trust Boundaries (summary — full detail in `trust-boundaries.md`)
CONFIRMED boundary locations (from brief):
- Browser boundary
- Local runtime boundary
- Privacy boundary (before network)
- Network boundary
- Cloud reasoning boundary
- Execution boundary

## Status
This is the V0 architecture description directly reflecting the brief's core loop. It has not yet passed through the V0 → V1 → V2 → V3 → freeze validation cycle described in `05-engineering/` methodology. See `architecture-freeze.md` for current freeze status (NOT YET FROZEN).
