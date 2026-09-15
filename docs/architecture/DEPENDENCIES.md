# VEIL — Module Dependency Graph

Status: DRAFT (PROPOSED). The dependency direction describes the actual architectural data flow. Circular dependencies are strictly prohibited.

## 1. Architectural Dependency Direction

Data flows sequentially from the browser, through local processing, to the cloud, and back to the browser via local validation.

```
Browser
  ↓
M02 Observation Manager
  ↓
M03 Local Visual Perception & M04 DOM/A11y Grounding & M05 Targeted OCR
  ↓
M06 Perception Fusion
  ↓
M07 Local Privacy Engine
  ↓
M08 Sanitization / Redaction
  ↓
M09 Remote Reasoner (Network Boundary Crossed)
  ↓
M10 Local Action Guard
  ↓
M11 Browser Executor
  ↓
Browser (Execution)
```

## 2. The Orchestrator
**M01 Browser Agent Core / Orchestrator** manages the state machine. It triggers M02, routes data through M03-M08, passes it to M09, and routes proposals to M10-M11. M01 depends on the interfaces of all other modules, but the modules themselves do not depend on M01's internals.

## 3. Strict Prohibitions
- **M09 (Remote Reasoner) MUST NOT depend on M11 (Browser Executor).** The remote reasoner only proposes; it cannot invoke execution.
- **M09 MUST NOT depend on M02 (Observation Manager).** The remote reasoner must only consume `SanitizedObservation` from M08.
- **M11 MUST NOT depend on M09.** M11 only consumes `ValidatedAction` from M10.
- **M08 (Sanitization) MUST sit strictly before the network boundary.**

## 4. Resolving Cycles
The closed-loop nature of the agent (Observe → Act → Observe) is managed by M01 (Orchestrator) moving the state machine back to the `OBSERVING` state. There are no circular code-level module dependencies. M11 does not call M02; M11 returns an `ExecutionResult` to M01, and M01 calls M02.
