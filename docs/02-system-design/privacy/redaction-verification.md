# Redaction Verification

## Purpose
Independently verify that sanitized output does not still contain sensitive content before it is allowed to cross the network boundary — a check on the sanitization step itself, not a duplicate of detection.

## Mechanism
UNKNOWN — not yet designed. PROPOSED: re-run (a subset of) detection against the sanitized output and require a clean result before transmission is permitted.

## Failure-Safe Behavior
CONFIRMED principle: if verification cannot confirm the sanitized output is clean, transmission must be blocked — this is a second fail-closed gate in addition to `privacy-engine.md`'s own fail-closed detection behavior.

## Open Questions
- UNKNOWN: performance cost of double-checking; whether this is done per-transmission or sampled.
