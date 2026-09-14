# Action Validation

## Purpose
Sole local gate that authorizes execution of a proposed action (Privacy Principle #5: "Local validation is mandatory before browser execution").

## Checks (PROPOSED — not yet frozen)
- Schema validity of the proposal.
- Staleness: does the proposal reference an observation that is still current, or has the page changed since (see `04-state/observation-state.md`)?
- Authorization: is the proposed action type/target permitted in the current state?

## Failure Behavior
CONFIRMED: an invalid, stale, or unauthorized proposal must not execute. See `10-quality/acceptance-tests.md` scenarios 6 ("Cloud proposes invalid action") and 7 ("Page changes before execution").

## Open Questions
- UNKNOWN: exact staleness-detection mechanism (e.g., state hash comparison — see `04-state/observation-state.md`'s "state hash" field, itself still PROPOSED).
