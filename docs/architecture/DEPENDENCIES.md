# VEIL — Module Dependency Graph

Status: DRAFT (PROPOSED). Module boundaries are defined in `MODULES.md` (root). Direction is data-flow direction along the core loop.

## 1. Allowed Dependency Direction

```
M01 Chrome Extension Shell
   → M02 Observation Engine
   → M03 Local Visual Perception
   → M04 Perception Fusion
   → M05 Privacy Engine
   → M06 Sanitized Context Builder
   → M07 Reasoning Gateway (network boundary)
   → M08 Local Action Guard
   → M09 Browser Executor
   → M02 (re-observe, loops back)

M10 Agent State / Orchestration — depends on and orchestrates M01–M09.
M11 Validation / Test Harness — depends on M01–M10 (test-only dependency).
```

## 2. Canonical Edge List (M-x → M-y means M-x may depend on M-y)

| Edge | Dependence | Reason |
|---|---|---|
| M01 → none | Shell depends on no internal module for its backbone | Shell hosts the rest; other modules depend on it |
| M02 → M01 | Observation needs extension/page access | Chrome APIs |
| M03 → M02 | Local perception needs raw screenshot | Core loop |
| M04 → M03, M02 | Fusion needs visual grounding + DOM/A11y | Core loop |
| M05 → M04 | Privacy engine needs fused perception | Core loop |
| M06 → M05 | Sanitized context built from sanitized observation | Core loop |
| M07 → M06 | Reasoning gateway consumes sanitized context only | Privacy invariant |
| M08 → M07, M02, M10 | Guard validates proposal against current state | Staleness + authz |
| M09 → M08 | Executor consumes validated action only | Execution authority |
| M10 → all | Orchestration triggers all stages | State machine |
| M11 → all (test-only) | Test harness exercises interfaces | Validation |

M02, M03, M04, M05, M06, M08, M09, M10 all depend on M01 (hosted inside the extension). This is implied, not drawn as separate edges to keep the graph readable.

## 3. Forbidden Dependencies (CONFIRMED by architectural principle)

1. M07 (and anything crossing the network boundary) must NOT depend on raw screenshots, raw DOM dumps, or any pre-sanitization data.
2. M09 must NOT act directly on M07's raw output without going through M08 (action validation).
3. No module downstream of M05 may bypass privacy-engine sanitization on any code path.
4. M10 must not persist raw pre-sanitization data in any form that could later be transmitted.
5. M08 must not hold execution authority alone — validation and execution are separate modules.

## 4. Circular Dependency Prohibition

- The graph is acyclic in the pipeline direction by definition.
- The only loop is M09 → M02 — **re-observation**, which is intentional and is a data-flow loop, not a dependency cycle: M09 emits an execution result; M02 responds to a new observation trigger. No module imports another in a cycle.
- [PROPOSED] Enforce at review time: any new edge that creates a cycle in the canonical edge list requires an ADR.

## 5. Privacy-Boundary Dependencies

- The privacy boundary sits between M06 (allowed to cross) and M07 (consumes crossed data).
- Only M06 → M07 crosses OUTBOUND (sanitized context).
- Only M07 → M08 crosses INBOUND (action proposal), and the result is treated as untrusted until M08 validates (SEC-002).
- Any code path that could transmit data across the network boundary must be traceable to having passed through M05/M06 verification [CODING STANDARD, PROPOSED].

## 6. Extension ↔ Local Runtime Relationships

[UNKNOWN] Exact process/worker split (e.g., extension background worker vs. separate local model runtime) is not yet designed. PROPOSED shape: the extension hosts the agent loop; on-device inference for ShowUI-2B runs in a local runtime available to the extension. VALIDATION REQUIRED.

## 7. Local ↔ Server (Cloud) Relationships

- Local: M01–M06, M08–M10. Remote: M07's cloud reasoning model.
- Only M07 talks to the remote model. No other module may open a network connection.
- [PROPOSED] Enforce: any module other than M07 that initiates network I/O violates the architecture.

## 8. Enforcement & Open Questions

- [UNKNOWN] Language-level/package-level enforcement mechanism (module boundaries, lint rules) — depends on implementation language choice.
- [UNKNOWN] Implementation language(s)/framework(s) — not specified.