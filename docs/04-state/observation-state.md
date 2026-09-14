# Observation State

## Fields (PROPOSED, from brief's explicit list)
- observation ID
- timestamp
- freshness (how recent relative to current execution point)
- state hash (for staleness comparison — see `02-system-design/execution/action-validation.md`)
- confidence
- evidence provenance
- observed
- not observed
- unknown

## Critical Rule
CONFIRMED, verbatim principle from brief: **NEVER treat UNKNOWN as NOT OBSERVED or FALSE.** These are three distinct states and must remain distinguishable throughout the pipeline.

## Open Questions
- UNKNOWN: exact hashing/comparison mechanism for staleness detection.
