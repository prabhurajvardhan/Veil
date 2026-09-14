# Privacy Engine

## Purpose
Sole local authority for determining what may cross the network boundary. Implements Privacy Principles #1, #2, #6, #7, #8 from the project brief.

## Sensitive-Data Detection
PROPOSED, two complementary detection paths:
- DOM-based detection: inspecting DOM/A11y evidence for known sensitive field types (e.g., password inputs, autofill-tagged fields) and patterns (e.g., structured PII-like text).
- Visual detection: inspecting fused visual evidence for sensitive-looking regions not captured structurally (e.g., an image of a document, a card number rendered as an image).

## Policy-Based Protection
UNKNOWN — no concrete policy engine/rule format has been defined yet. VALIDATION REQUIRED.

## Redaction / Sanitization
See `sanitization.md`.

## Verification
See `redaction-verification.md`.

## Network Boundary
CONFIRMED: All of the above must complete, and pass verification, before any data crosses the network boundary (Privacy Principle #2).

## Failure-Safe Behavior
CONFIRMED principle: If detection is uncertain, the system must not respond by exposing more data — uncertainty fails closed (Privacy Principle #7), and reduced local compute must reduce capability, not reduce privacy protection (Privacy Principle #8).
