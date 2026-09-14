# Privacy Testing

## Criticality
CONFIRMED: this is the most critical test category for VEIL, given the product's core promise.

## Required Test Areas (CONFIRMED, named in brief)
- Password leakage
- PII leakage
- Sensitive DOM values
- Visual sensitive information
- OCR leakage
- Redaction failure
- Insufficient redaction
- Reconstruction risk where practical
- Cloud payload inspection

## Method
UNKNOWN — no concrete test procedures exist yet for any of the above. PROPOSED baseline: for each acceptance-test scenario in `acceptance-tests.md` involving sensitive content, inspect the actual outbound network payload and assert it contains no raw sensitive data, in addition to functional assertions.

## Failure-Safe Verification
Every privacy test should also confirm the fail-closed principle: when detection is deliberately made uncertain, the system must not transmit additional data rather than proceeding.
