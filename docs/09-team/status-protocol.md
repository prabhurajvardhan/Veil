# Status Protocol

CONFIRMED status states, verbatim from brief:

PLANNED
READY
IN_PROGRESS
BLOCKED
IMPLEMENTED
UNDER_REVIEW
VALIDATED
INTEGRATED
DONE

## Open Questions
- UNKNOWN: exact allowed transitions between states (e.g., can BLOCKED go directly to DONE?) — not specified; PROPOSED that transitions follow the listed order, with BLOCKED reachable from any in-progress state and returning to the state it was blocked from once unblocked.
