# Concept: ShowUI

## Definition
CONFIRMED: ShowUI-2B is VEIL's primary local visual grounding model, run on-device.

## Purpose
Interpret a captured screenshot and produce grounded information about UI elements (e.g., what they are and roughly where they are) without that screenshot leaving the device.

## Role in VEIL
Sits inside the "Local Visual Understanding" stage of the core loop, feeding `02-system-design/perception/perception-fusion.md` alongside DOM/A11y evidence.

## What VEIL Expects From It
PROPOSED: element-level visual grounding output usable as one evidence source in perception fusion. Exact output schema: UNKNOWN.

## What It Does NOT Control
CONFIRMED by architectural separation: ShowUI-2B does not make privacy decisions, does not decide reasoning/actions, and does not execute anything — those belong to the privacy engine, cloud reasoning, and execution layer respectively.

## Inputs
Raw screenshot (local only).

## Outputs
Visual grounding result → perception fusion.

## Interfaces
UNKNOWN — no concrete integration schema defined yet.

## Failure Modes
UNKNOWN — model failure/timeout handling not yet specified.

## Security Implications
Runs entirely within the local runtime boundary; its raw input (the screenshot) must never cross the network boundary.

## Implementation Notes
"Do NOT redesign the project around a different model unless there is a concrete technical blocker" (CONFIRMED constraint from brief).

## Open Questions
- UNKNOWN: ShowUI-2B's actual capabilities, accuracy, and resource requirements on the target hardware — do not fabricate; requires direct testing.
