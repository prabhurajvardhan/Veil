# Action Proposal

## Purpose
The structured output of cloud reasoning describing the next action to attempt.

## Schema
UNKNOWN — not yet defined; must be structured per ADR-007 (see `../reasoning/context-contract.md` for the inbound-schema placeholder).

## Constraints
- CONFIRMED: an action proposal carries no execution authority by itself — it must pass `action-validation.md` before `browser-execution.md` may act on it.
- PROPOSED: an action proposal should reference the observation/element IDs it was reasoned against, to support staleness detection.

## Open Questions
- UNKNOWN: action vocabulary (click, type, navigate, etc.) — not yet enumerated.
