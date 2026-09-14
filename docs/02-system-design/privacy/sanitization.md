# Sanitization

## Purpose
Transform detected sensitive content into a form safe to send to the cloud reasoning model, while preserving enough structure for reasoning to remain useful.

## Mechanism
UNKNOWN — concrete redaction technique(s) (e.g., masking, tokenization, generalization) not yet chosen. PROPOSED that different sensitivity types may need different treatments (e.g., a password field may be fully omitted, while a name field might be generalized rather than omitted, if omission would break the reasoning model's ability to act).

## Interfaces
Input: fused perception result + sensitivity classification (from `privacy-engine.md`).
Output: sanitized observation (feeds `redaction-verification.md`, then the sanitized context contract — see `../reasoning/context-contract.md`).

## Failure Modes
- PROPOSED: sanitization step itself throws/fails → treat as detection uncertainty, i.e., fail closed, do not transmit.

## Open Questions
- UNKNOWN: exact per-sensitivity-type transformation rules.
