# VEIL — Vision

## Why VEIL Exists
CONFIRMED (from project brief): AI browser agents need access to a user's live screen and page content to complete tasks. That access routinely exposes sensitive information (credentials, personal data, financial details, private messages) to cloud reasoning models that do not need to see it to decide what action to take next.

## Core Problem
CONFIRMED: There is a structural tension between two requirements:
1. A reasoning model needs enough context about the page to decide the next action.
2. Sensitive on-screen content should not be transmitted to that reasoning model unnecessarily.

Most current browser-agent designs resolve this by sending raw screenshots or raw DOM dumps to the cloud, satisfying (1) at the expense of (2).

## Product Vision
CONFIRMED (one-line product definition, verbatim from brief): "VEIL lets AI use your browser to complete tasks while keeping sensitive screen information private."

PROPOSED: VEIL's long-term direction is to make local-first perception and privacy enforcement a standard layer that any cloud reasoning model can sit behind, so the choice of reasoning model never determines how much sensitive data leaves the device.

## Long-Term Direction
PROPOSED — none of the following is committed for V1 and each requires re-evaluation after the V1 loop works end-to-end:
- Support for multiple reasoning-model backends behind the same local privacy layer.
- Adaptive inference (dynamically choosing local compute spend based on task difficulty).
- Broader browser/OS coverage beyond the initial target environment.

VALIDATION REQUIRED: Whether any of the above is technically necessary is not yet established.

## What VEIL Is NOT
- NOT a general-purpose screen-recording or screen-sharing tool.
- NOT a system that grants the cloud reasoning model execution authority — the cloud only proposes actions; a local validator authorizes execution.
- NOT a system that treats "unknown" sensitivity as "safe to send" — privacy uncertainty fails closed by design principle.
- NOT, for V1, a research platform for adaptive inference, multi-model routing, or reconstruction-attack defense (see `scope.md`).

## Open Questions
- UNKNOWN: Target browser(s) and OS(es) for V1.
- UNKNOWN: Deployment model (browser extension vs. standalone app vs. both).
