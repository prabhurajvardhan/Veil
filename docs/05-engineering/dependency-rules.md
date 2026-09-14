# Dependency Rules

## Allowed Dependencies (PROPOSED, following the pipeline direction)
- Perception modules may depend on: browser observation output.
- Privacy engine may depend on: fused perception output.
- Reasoning module may depend on: sanitized output only (never raw perception/observation data).
- Execution module may depend on: validated action + current observation state.

## Forbidden Dependencies (CONFIRMED by architectural principle)
- Reasoning module (and anything crossing the network boundary) must NOT depend on raw screenshots, raw DOM dumps, or any pre-sanitization data.
- Execution module must NOT act directly on a cloud reasoning output without passing through action validation.
- No module downstream of privacy detection may bypass privacy engine sanitization on any code path.

## Open Questions
UNKNOWN: language-level/package-level enforcement mechanism (e.g., module boundaries, lint rules) — depends on implementation language choice (UNKNOWN).
