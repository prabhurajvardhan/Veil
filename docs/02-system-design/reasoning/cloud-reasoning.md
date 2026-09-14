# Cloud Reasoning

## Purpose
Given sanitized context, propose the next action toward completing the user's task.

## What the Cloud Receives
CONFIRMED principle: sanitized, structured context only — never arbitrary raw screen data (Privacy Principle #3, ADR-008). See `context-contract.md` for the exact schema (currently draft).

## What the Cloud Does NOT Have
CONFIRMED: no execution authority (Privacy Principle #4) — it can only propose actions, which are then locally validated (`../execution/action-validation.md`) before anything executes.

## Model / Provider
UNKNOWN — not yet selected. Do not assume any specific vendor or API.

## Failure Modes
- UNKNOWN network/timeout handling.
- PROPOSED: if the cloud is unavailable, the agent should surface a clear failure state rather than proceeding with a stale or guessed action (see `10-quality/acceptance-tests.md`, scenario 8: "Model/runtime unavailable").
