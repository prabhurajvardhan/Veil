# VEIL — Trust Boundaries

For each component: what it IS trusted to do, and what it is explicitly NOT trusted to do. All PROPOSED pending system design freeze.

## Browser
- Trusted to: accurately reflect page state when observed; execute DOM/UI actions issued to it.
- Not trusted to: self-report sensitivity of its own content — that judgment belongs to the privacy engine.

## Local Perception (ShowUI-2B + fusion)
- Trusted to: produce visual/structural grounding of the current observation.
- Not trusted to: make privacy decisions, or to be the sole source of truth about page state (fused against DOM/A11y evidence).

## Privacy Engine
- Trusted to: be the sole gate deciding what crosses the network boundary.
- Not trusted to: pass through uncertain content — uncertainty must fail closed (Privacy Principle #7).

## Cloud Reasoning Model
- Trusted to: propose the next action based on sanitized context.
- Not trusted to: receive raw/unsanitized data, or to execute actions directly (Privacy Principle #4).

## Local Action Validator
- Trusted to: be the sole authority permitting execution of a proposed action.
- Not trusted to: approve actions against stale or unverified page state without re-observation.

## Execution Layer
- Trusted to: execute only validated actions.
- Not trusted to: execute a cloud proposal directly without passing through the validator.

## Open Questions
- UNKNOWN: Formal threat model / adversary assumptions — not yet specified.
