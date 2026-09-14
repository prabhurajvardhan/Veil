# Coding Standards

## Status
UNKNOWN / not yet specified — implementation language(s) have not been chosen (see `repository-structure.md`), so naming/typing/error-handling conventions cannot be meaningfully fixed yet.

## Security Practices (CONFIRMED principles, language-agnostic)
- Never log or persist raw pre-sanitization sensitive data.
- Any code path that could transmit data across the network boundary must be traceable to having passed through privacy-engine verification.
- Treat privacy-detection uncertainty as a code-level "fail closed" branch, not an exception to swallow silently.

## Testing Expectations
See `10-quality/test-strategy.md`. At minimum, any change touching the privacy engine or the network-boundary crossing point requires an accompanying privacy test (`10-quality/privacy-testing.md`).

## Open Questions
- UNKNOWN: naming conventions, formatting/linting tools, typing discipline — pending language choice.
