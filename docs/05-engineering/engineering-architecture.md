# Engineering Architecture

## Purpose
Define the implementation-level architecture that realizes `01-architecture/architecture.md` in actual code/modules.

## Status
DRAFT — depends on Architecture Freeze and System Design Freeze, neither of which has occurred yet. This document should be revisited once both freezes land.

## Placeholder Structure (PROPOSED)
- `perception/` — local visual perception, ShowUI-2B integration, perception fusion.
- `privacy/` — detection, sanitization, verification.
- `reasoning/` — cloud reasoning client, context contract implementation.
- `execution/` — action proposal parsing, validation, browser execution, verification.
- `state/` — state machine, agent state, observation state.

VALIDATION REQUIRED before this becomes authoritative — see `repository-structure.md`.
