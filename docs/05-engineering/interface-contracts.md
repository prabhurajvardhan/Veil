# Interface Contracts

## Purpose
Define contracts between modules: producer, consumer, input schema, output schema, errors, invariants.

## Status
DRAFT — no concrete schemas exist yet system-wide. This document is a placeholder registry to be filled in once System Design Freeze occurs.

## Known Contract Points (names only; schemas UNKNOWN)
| Contract | Producer | Consumer |
|---|---|---|
| Raw observation | Observation module | Local perception |
| Visual grounding result | ShowUI-2B integration | Perception fusion |
| Fused perception result | Perception fusion | Privacy engine |
| Sensitivity classification | Privacy engine (detection) | Privacy engine (sanitization) |
| Sanitized observation | Privacy engine (sanitization + verification) | Reasoning module |
| Sanitized context | Reasoning module (client) | Cloud reasoning model |
| Action proposal | Cloud reasoning model | Action validation |
| Validated action | Action validation | Browser execution |

For every row above: input schema, output schema, error conditions, and invariants are UNKNOWN and VALIDATION REQUIRED before implementation begins.
