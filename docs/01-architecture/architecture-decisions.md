# VEIL — Architecture Decision Records (ADR)

Status: DRAFT. None of the following decisions are frozen yet (see `architecture-freeze.md`).

---
## ADR-001: Why Local Perception?
- Context: The agent needs to understand what's on screen to act.
- Decision: Perform visual/structural understanding of the page locally, on-device, rather than sending raw screen data to the cloud for interpretation.
- Alternatives Considered: Cloud-side vision model interpreting raw screenshots.
- Why Selected: PROPOSED rationale — keeps raw sensitive visual data from ever leaving the device, consistent with Privacy Principle #1 ("Raw sensitive visual data must not be unnecessarily transmitted").
- Trade-offs: PROPOSED — local perception requires an on-device model (ShowUI-2B) and its associated compute cost, in exchange for privacy.
- Status: PROPOSED, not yet validated.
- Validation Required: Confirm local hardware can run ShowUI-2B within an acceptable latency budget (budget itself: UNKNOWN).

---
## ADR-002: Why ShowUI-2B?
- Context: A local model is needed for visual grounding.
- Decision: Use ShowUI-2B as the primary local visual grounding model (CONFIRMED as given in the brief; "Do NOT redesign the project around a different model unless there is a concrete technical blocker").
- Alternatives Considered: UNKNOWN — no alternatives have been evaluated in this documentation pass.
- Why Selected: CONFIRMED as a project-level given, not re-derived here.
- Trade-offs: UNKNOWN — no benchmark data available; do not fabricate.
- Status: CONFIRMED as the default; PROPOSED for how it integrates.
- Validation Required: On-device performance/accuracy validation.

---
## ADR-003: Why Cloud Reasoning?
- Context: On-device compute is likely insufficient for the reasoning/planning capability needed to complete arbitrary tasks.
- Decision: PROPOSED — delegate high-level task reasoning and action proposal to a cloud-hosted reasoning model, while keeping perception and privacy enforcement local.
- Alternatives Considered: Fully local reasoning. UNKNOWN whether evaluated; ASSUMPTION that current on-device models are insufficient for general task planning has not been validated in this document.
- Trade-offs: Introduces a network boundary and a dependency on an external model; mitigated by only sending sanitized context.
- Status: PROPOSED.
- Validation Required: Confirm no viable fully-local alternative meets V1 capability needs.

---
## ADR-004: Why Privacy Enforcement Is Local?
- Context: Sensitive data must not reach the cloud unnecessarily.
- Decision: CONFIRMED — privacy detection and sanitization occur before the network boundary, on-device.
- Alternatives Considered: Cloud-side redaction after transmission — rejected because it requires the sensitive data to already have left the device.
- Why Selected: Directly required by Privacy Principle #2.
- Trade-offs: All sensitive-data detection logic must run within local resource constraints.
- Status: CONFIRMED as architectural principle.
- Validation Required: Detection accuracy/coverage (see `10-quality/privacy-testing.md`).

---
## ADR-005: Why Reasoning and Execution Authority Are Separated?
- Context: If the cloud model could directly execute actions, a compromised or manipulated reasoning response could act on the browser with no local check.
- Decision: CONFIRMED — the cloud only proposes actions; a local validator must authorize before execution (Privacy Principle #4, #5).
- Trade-offs: Adds a validation step/latency between proposal and execution.
- Status: CONFIRMED as architectural principle.
- Validation Required: Definition of the validator's concrete rule set (see `02-system-design/execution/action-validation.md`).

---
## ADR-006: Why Closed-Loop Observation Is Required?
- Context: The browser state may have changed since the last observation (by the time an action executes).
- Decision: CONFIRMED — every execution is followed by re-observation and verification, and the loop treats page-state staleness as a first-class concern.
- Trade-offs: Additional latency per action cycle.
- Status: CONFIRMED as architectural principle (core loop structure).
- Validation Required: Staleness-detection mechanism (see `02-system-design/execution/browser-execution.md`).

---
## ADR-007: Why Structured Observations Are Preferable to Arbitrary Model Prose?
- Context: If perception output is free-form text, downstream privacy detection and reasoning become unreliable and harder to audit.
- Decision: PROPOSED — perception fusion output and the sanitized context sent to the cloud must be structured data, not arbitrary prose.
- Trade-offs: Requires defining and maintaining explicit schemas (see `05-engineering/interface-contracts.md`).
- Status: PROPOSED.
- Validation Required: Concrete schema definition and testing.

---
## ADR-008: Why Raw Screenshots Must Not Cross the Privacy Boundary?
- Context: A raw screenshot may contain arbitrary sensitive visual content that cannot be reliably filtered after the fact.
- Decision: CONFIRMED — raw screenshots stay within the local runtime boundary; only sanitized, structured context crosses the network boundary.
- Trade-offs: The cloud reasoning model never sees pixels directly, so its context must be rich enough (structurally) to compensate.
- Status: CONFIRMED as architectural principle.
- Validation Required: Confirm the sanitized context schema carries enough information for the cloud model to reason effectively (V1 acceptance testing).
