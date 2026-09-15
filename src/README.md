# VEIL — Implementation Boundary

## Status

**No implementation yet.** Do NOT begin implementation ahead of the freeze sequence in `docs/engineering/WORKFLOW.md`.

## Planned Module Layout (PROPOSED)

Mirror the module registry in `MODULES.md` once implementation begins. The `Mxx` module IDs are the stable references for branches, tasks, and ownership.

```
src/
  m01-core/           Browser Agent Core / Orchestrator
  m02-observation/    Observation Manager
  m03-visual/         Local Visual Perception
  m04-dom/            DOM / Accessibility Grounding
  m05-ocr/            Targeted OCR
  m06-fusion/         Perception Fusion
  m07-privacy/        Local Privacy Engine
  m08-sanitization/   Sanitization / Redaction
  m09-reasoning/      Remote Reasoner (Client/Gateway)
  m10-guard/          Local Action Guard
  m11-executor/       Browser Executor
```

## Boundary Gate

- Workers implement **only within their module's allowed scope** (`MODULES.md`) and its assigned task (`TASKS.md`).
- No module may depend on another module's internals — only contracts from `INTERFACES.md`.
- Raw browser data never crosses the network boundary (`docs/privacy/PRIVACY-BOUNDARY.md`).
- Implementation language / tooling: [UNKNOWN — chosen before Phase 7].
