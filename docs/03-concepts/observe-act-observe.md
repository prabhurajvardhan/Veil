# Concept: Observe-Act-Observe (Closed Loop)

## Definition
The pattern of re-observing the browser after every executed action and verifying the outcome, rather than assuming an action succeeded.

## Why It Exists
Implements ADR-006 ("Why Closed-Loop Observation Is Required") — browser state can change between proposal and execution, and success cannot be assumed without checking.

## Role in VEIL
Structures the tail end of every iteration of the core loop: execution → re-observation → verification → (next iteration or COMPLETE).
