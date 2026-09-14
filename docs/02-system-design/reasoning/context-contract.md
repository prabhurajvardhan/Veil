# Sanitized Context — Contract

## Purpose
Define exactly what data structure is permitted to cross the network boundary toward the cloud reasoning model, and what the cloud reasoning model is expected to return.

## Principle
CONFIRMED: The cloud must receive sanitized structured context, not arbitrary raw screen data.

## Outbound Schema (sanitized context)
UNKNOWN — not yet defined. PROPOSED shape (illustrative only, not authoritative): task description, structured element list with sanitized labels/roles/positions, current step number, and any accumulated task-relevant state — all post-sanitization.

## Inbound Schema (action proposal)
UNKNOWN — not yet defined. Must be structured (per ADR-007), not free-form prose, to support local validation. See `../execution/action-proposal.md`.

## Invariants
- CONFIRMED: no field in the outbound schema may contain content that failed sanitization/verification.
- PROPOSED: the inbound action proposal must reference elements/observations by ID from the most recent sanitized context, not by arbitrary description, to support staleness checks.

## Open Questions
- UNKNOWN: exact field-level schema for both directions — requires system design freeze before implementation.
