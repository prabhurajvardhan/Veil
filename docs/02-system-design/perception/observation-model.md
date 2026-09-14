# Observation Model

## Definition
An "observation" is the raw or fused representation of browser state captured at a point in time, used as input to perception and, later, privacy detection.

## Purpose
Give every downstream stage (fusion, privacy, reasoning, validation) a consistent, identifiable unit of "what did we see and when."

## Fields (PROPOSED, not frozen)
- observation ID
- timestamp
- source browser tab/context (UNKNOWN structure)
- raw screenshot reference (local-only, never serialized to network)
- DOM/A11y snapshot reference
- fused perception result reference

## Failure Modes
- PROPOSED: capture failure (e.g., permission denied, page not ready) must produce an explicit failure observation, not a silently empty one.

## Open Questions
- UNKNOWN: retention policy for raw observations (how long kept locally, if at all).
