# VEIL — Requirements

Status: DRAFT — Requirements Freeze not yet performed. See `freezes/requirements-freeze.md`.

## Functional Requirements
CONFIRMED (derived from core loop in brief):
- FR1: Accept a natural-language user task.
- FR2: Capture a browser observation (screenshot and/or DOM/accessibility tree).
- FR3: Perform local visual understanding of the observation using ShowUI-2B.
- FR4: Fuse visual and structural (DOM/A11y) evidence into a single perception result.
- FR5: Detect sensitive information in the fused perception before any network transmission.
- FR6: Sanitize (redact/transform) detected sensitive information.
- FR7: Send only the sanitized context to a cloud reasoning model.
- FR8: Receive a structured action proposal from the cloud reasoning model.
- FR9: Locally validate the proposed action before execution.
- FR10: Execute validated actions in the browser.
- FR11: Re-observe the browser after execution.
- FR12: Verify whether the task/action succeeded.

## Non-Functional Requirements
UNKNOWN — not yet specified. VALIDATION REQUIRED for: latency budget, throughput, resource ceilings (RAM/CPU), offline behavior.

## Privacy Requirements
CONFIRMED (from Privacy Principles in brief):
- Raw sensitive visual data must not be unnecessarily transmitted.
- Privacy enforcement happens before the network boundary.
- Cloud reasoning does not receive unrestricted screen access.
- The cloud proposes actions; it does not receive execution authority.
- Local validation is mandatory before browser execution.
- Unknown information must remain unknown (never coerced to "not observed" or "false").
- Privacy uncertainty must fail closed.
- Reduced compute must reduce capability, not reduce privacy.

## Browser Requirements
UNKNOWN — target browser(s)/version(s) not yet specified. VALIDATION REQUIRED.

## Local Inference Requirements
CONFIRMED: Local visual grounding must run via ShowUI-2B.
UNKNOWN: Hardware/runtime requirements to run ShowUI-2B locally — not yet specified. Do not invent RAM/latency figures (see anti-hallucination rule).

## Reasoning Requirements
CONFIRMED: Cloud reasoning model must receive sanitized structured context only, never arbitrary raw screen data (see `02-system-design/reasoning/context-contract.md`).
UNKNOWN: Which specific cloud reasoning model/provider — not yet specified.

## Action Execution Requirements
CONFIRMED: Every proposed action must pass local validation before execution; execution must be followed by re-observation and verification.

## Observability Requirements
UNKNOWN — logging, telemetry, and audit requirements not yet specified. VALIDATION REQUIRED, particularly around what may or may not be logged given privacy constraints.

## Explicit Unknowns
- UNKNOWN: Target platform(s)/browser(s).
- UNKNOWN: Cloud reasoning model/provider.
- UNKNOWN: Performance/latency targets.
- UNKNOWN: Hardware requirements for local ShowUI-2B inference.
- UNKNOWN: SIH-specific requirements (referenced in brief but not provided) — do not fabricate.
