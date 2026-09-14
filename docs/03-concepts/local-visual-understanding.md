# Concept: Local Visual Understanding

## Definition
The stage of the core loop where ShowUI-2B processes a raw screenshot entirely on-device to produce visual grounding.

## Purpose
Provide visual evidence about the page without transmitting raw pixels anywhere.

## Role in VEIL
Feeds perception fusion (see `02-system-design/perception/perception-fusion.md`). See also `showui.md` for the specific model used.

## Inputs / Outputs
Input: raw screenshot. Output: visual grounding result.

## Failure Modes / Open Questions
See `showui.md` and `02-system-design/perception/local-visual-perception.md`.
