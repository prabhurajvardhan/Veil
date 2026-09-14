# Agent State (Persistent / Runtime)

## Purpose
Define what state the agent carries across iterations of the core loop for a single task.

## Fields (PROPOSED, not frozen)
- current task description
- current state-machine state (see `state-machine.md`)
- most recent observation reference (see `observation-state.md`)
- iteration/step count
- accumulated task-relevant context derived from sanitized observations (never raw)

## Constraints
CONFIRMED: no raw (pre-sanitization) sensitive data may be retained in persistent agent state that could later be transmitted.

## Open Questions
- UNKNOWN: how long agent state persists across tasks, if at all.
