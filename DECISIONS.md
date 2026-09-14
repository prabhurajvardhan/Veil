# VEIL — Architecture Decision Records (ADRs)

Status: DRAFT. ADR-001…ADR-010 inherit statuses from the previous records (preserved, see `docs/01-architecture` history); ADR-011 records this restructure. Nothing is frozen until `docs/freezes/ARCHITECTURE.md` says so.

## Format

Every ADR: **ID / Context / Decision / Alternatives / Reason / Trade-offs / Status / Validation.**

---

### ADR-001 — Local Perception
- **ID:** ADR-001
- **Context:** The agent needs to understand what's on screen to act; sending raw screenshots to the cloud for interpretation leaks data.
- **Decision:** Perform visual/structural understanding of the page locally, on-device, rather than sending raw screen data to the cloud for interpretation.
- **Alternatives:** Cloud-side vision model interpreting raw screenshots.
- **Reason:** PROPOSED — keeps raw sensitive visual data from ever leaving the device (PRIV-001).
- **Trade-offs:** Local perception requires an on-device model and compute cost, in exchange for privacy.
- **Status:** PROPOSED; not yet validated.
- **Validation:** Confirm local hardware can run the model within an acceptable latency budget (budget: [UNKNOWN]).

### ADR-002 — ShowUI-2B as the Local Visual Grounding Model
- **ID:** ADR-002
- **Context:** A local model is needed for visual grounding.
- **Decision:** Use ShowUI-2B as the primary local visual grounding model.
- **Alternatives:** [UNKNOWN] — no alternatives evaluated in prior documents.
- **Reason:** CONFIRMED as a project-level given ("Do NOT redesign the project around a different model unless there is a concrete technical blocker").
- **Trade-offs:** [UNKNOWN] — no benchmark data exists; do not fabricate.
- **Status:** CONFIRMED as default; integration PROPOSED.
- **Validation:** On-device performance/accuracy validation.

### ADR-003 — Cloud Reasoning
- **ID:** ADR-003
- **Context:** On-device compute is likely insufficient for the reasoning/planning needed for arbitrary tasks.
- **Decision:** PROPOSED — delegate high-level task reasoning and action proposal to a cloud-hosted reasoning model; keep perception and privacy enforcement local.
- **Alternatives:** Fully local reasoning. [UNKNOWN] whether evaluated.
- **Reason:** ASSUMPTION that current on-device models are insufficient for general task planning — not validated in prior docs.
- **Trade-offs:** Introduces a network boundary and external-model dependency; mitigated by sending only sanitized context.
- **Status:** PROPOSED.
- **Validation:** Confirm no viable fully-local alternative meets V1 capabilities.

### ADR-004 — Privacy Enforcement Is Local
- **ID:** ADR-004
- **Context:** Sensitive data must not reach the cloud unnecessarily.
- **Decision:** Privacy detection and sanitization occur before the network boundary, on-device.
- **Alternatives:** Cloud-side redaction after transmission — rejected because it requires sensitive data to have already left the device.
- **Reason:** Required by PRIV-002.
- **Trade-offs:** Sensitive-data detection must run within local resource constraints.
- **Status:** CONFIRMED as architectural principle.
- **Validation:** Detection accuracy/coverage via `docs/privacy/PRIVACY-TESTING.md`.

### ADR-005 — Reasoning and Execution Authority Are Separated
- **ID:** ADR-005
- **Context:** A cloud model that could directly execute actions would let a compromised/manipulated response act on the browser with no local check.
- **Decision:** The cloud only proposes actions; a local validator must authorize before execution.
- **Alternatives:** Cloud-controlled execution.
- **Reason:** PRIV-004, PRIV-005.
- **Trade-offs:** Adds a validation step/latency between proposal and execution.
- **Status:** CONFIRMED as architectural principle.
- **Validation:** Definition of the validator's concrete rule set at System Design Freeze.

### ADR-006 — Closed-Loop Observation Is Required
- **ID:** ADR-006
- **Context:** Browser state may change between proposal and execution.
- **Decision:** Every execution is followed by re-observation and verification; page-state staleness is a first-class concern.
- **Alternatives:** Fire-and-forget execution.
- **Reason:** Success cannot be assumed without checking.
- **Trade-offs:** Additional latency per action cycle.
- **Status:** CONFIRMED (core loop structure).
- **Validation:** Staleness-detection mechanism [UNKNOWN].

### ADR-007 — Structured Observations Preferable to Arbitrary Prose
- **ID:** ADR-007
- **Context:** Free-form perception/reasoning output makes privacy detection and reasoning unreliable and hard to audit.
- **Decision:** Perception fusion output and the sanitized context sent to the cloud must be structured data, not arbitrary prose.
- **Alternatives:** Free-form text contexts.
- **Reason:** Auditability, determinism of downstream validation.
- **Trade-offs:** Requires defining and maintaining explicit schemas.
- **Status:** PROPOSED.
- **Validation:** Concrete schema definition and testing at System Design Freeze.

### ADR-008 — Raw Screenshots Must Not Cross the Privacy Boundary
- **ID:** ADR-008
- **Context:** A raw screenshot may contain arbitrary sensitive visual content that cannot be reliably filtered after the fact.
- **Decision:** Raw screenshots stay within the local runtime boundary; only sanitized, structured context crosses the network boundary.
- **Alternatives:** Sending sanitized/blurred images.
- **Reason:** PRIV-001; "filter after the fact" is unreliable.
- **Trade-offs:** The cloud never sees pixels, so sanitized context must be structurally rich enough for reasoning.
- **Status:** CONFIRMED as architectural principle.
- **Validation:** Confirm the sanitized-context schema carries enough information for effective reasoning (V1 acceptance).

### ADR-009 — Chrome Extension as Deployment Target
- **ID:** ADR-009
- **Context:** VEIL is an AI-powered Chrome browser extension / browser agent.
- **Decision:** V1 runs as a Chrome extension (backend in the browser), with local on-device inference available to it.
- **Alternatives:** Standalone app, other browsers.
- **Reason:** CONFIRMED product direction.
- **Trade-offs:** Extension permission model must support the local runtime; other browsers deferred (FUTURE).
- **Status:** CONFIRMED deployment target.
- **Validation:** Extension permission model feasibility [VALIDATION REQUIRED].

### ADR-010 — Local Visual Grounding (requirement) vs ShowUI-2B (implementation)
- **ID:** ADR-010
- **Context:** Charting must not conflate an architectural requirement with its implementation.
- **Decision:** The architectural requirement is **LOCAL VISUAL GROUNDING**; ShowUI-2B is the chosen implementation. Replacement of the model is an implementation change subject to validation and the decision process, not a change of the architecture.
- **Alternatives:** Any other local visual grounding implementation.
- **Reason:** Allows replacement if validation shows a better implementation (see `docs/perception/SHOWUI.md`).
- **Trade-offs:** Requires distinguishing ADR-002 (implementation) from this ADR (requirement).
- **Status:** CONFIRMED as decision-process rule.
- **Validation:** None required beyond the requirement/implementation distinction itself.

### ADR-011 — VEIL Documentation Restructure
- **ID:** ADR-011
- **Context:** The repository carried a PEAAI-influenced numbering scheme with duplicate pointers, scattered leftovers, and a hierarchical docs tree that complicated AI-agent navigation.
- **Decision:** Restructure to a lean control system: root-level control files (README, STATUS, TASKS, MODULES, INTERFACES, DECISIONS) + focused topical docs + freeze records. Replace former module IDs (VEIL-OBS…VEIL-STATE, e.g. `VEIL-PERCEPTION-001`) with `Mxx` IDs (`M03-T0xx` branch naming). Move the project's conceptual summary (vision/product/scope) into the requirements document header.
- **Alternatives:** Keep the numbered PEAAI-shaped tree.
- **Reason:** Discipline adapted to VEIL's actual engineering problem; fewer layers, clearer boundaries, faster AI-agent orientation.
- **Trade-offs:** History moved; superseded by this record. Old module IDs appear in historic git history.
- **Status:** CONFIRMED (this restructure).
- **Validation:** Structure validated against the VEIL architecture per the restructure mandate.