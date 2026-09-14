# VEIL — System Boundaries

CONFIRMED boundary set (from brief). Each is described qualitatively; concrete implementation is UNKNOWN/PROPOSED pending system design.

## Browser Boundary
The boundary between VEIL and the browser it observes/controls. Crossed by: observation capture (in) and action execution (out).

## Local Runtime Boundary
The boundary around all on-device processing (ShowUI-2B inference, perception fusion, privacy engine). Nothing inside this boundary is assumed network-accessible.

## Privacy Boundary
The last point before the network boundary at which sensitive-content detection and sanitization must have already occurred. Privacy Principle #2: enforcement happens local to this boundary, before network.

## Network Boundary
The boundary crossed when sanitized context is transmitted to the cloud reasoning model, and when an action proposal is received back. Only sanitized, structured data may cross outward; only structured action proposals may cross inward.

## Cloud Reasoning Boundary
The boundary around the cloud reasoning model itself. It receives sanitized context and returns action proposals only — it has no direct access to the browser or local runtime, and no execution authority (Privacy Principle #4).

## Execution Boundary
The boundary at which a validated action proposal is allowed to actually act on the browser. Crossed only after local validation succeeds.

## Open Questions
- UNKNOWN: Process/sandbox isolation model for the local runtime.
- UNKNOWN: Transport mechanism/protocol across the network boundary.
