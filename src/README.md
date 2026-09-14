# VEIL — Implementation Boundary

## Status

**No implementation yet.** Do NOT begin implementation ahead of the freeze sequence in `docs/engineering/WORKFLOW.md` (Requirements → Architecture → System Design → Module freezes, then tasks, then employees).

## Planned Module Layout (PROPOSED — subject to Module Freeze)

Mirror the module registry in `MODULES.md` once implementation begins. The `Mxx` module IDs are the stable references for branches, tasks, and ownership.

```
src/
  m01-shell/        Chrome Extension Shell
  m02-observation/  Observation Engine
  m03-perception/   Local Visual Perception (ShowUI-2B)
  m04-fusion/       Perception Fusion
  m05-privacy/      Privacy Engine (detection, sanitization, verification)
  m06-context/      Sanitized Context Builder
  m07-reasoning/    Reasoning Gateway
  m08-guard/        Local Action Guard
  m09-executor/     Browser Executor
  m10-state/        Agent State / Orchestration
  m11-test-harness/ Validation / Test Harness
```

## Boundary Gate

- Workers implement **only within their module's allowed scope** (`MODULES.md`) and its assigned task (`TASKS.md`).
- No module may depend on another module's internals — only contracts from `INTERFACES.md`.
- Raw browser data never crosses the network boundary (`docs/privacy/PRIVACY-BOUNDARY.md`).
- Implementation language / tooling: [UNKNOWN — chosen before Phase 7].