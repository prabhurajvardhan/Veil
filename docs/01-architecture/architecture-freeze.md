# VEIL — Architecture Freeze

## Status
**NOT FROZEN.** The architecture in `architecture.md` and `architecture-decisions.md` reflects V0, derived directly from the project brief. It has not yet gone through the required V0 → validation → V1 → validation → V2 → validation → V3 → validation → FREEZE cycle defined in `05-engineering/`.

## Version
V0 (draft, unvalidated).

## Decisions Frozen
None. All ADRs in `architecture-decisions.md` are PROPOSED or CONFIRMED-as-given-constraint, not yet validated as a coherent whole.

## Known Limitations
- No performance, hardware, or latency data exists yet for ShowUI-2B on the target platform.
- No cloud reasoning model has been selected.
- No concrete schemas exist yet for the sanitized context or action proposal (see `05-engineering/interface-contracts.md`, currently also draft).

## Remaining Validation
- Architecture V1 review against requirements (`00-project/requirements.md`).
- At least one additional validation pass (V2/V3) before this may be marked FROZEN, per the mandated lifecycle.

## Rules for Changing Frozen Architecture
Not applicable until a freeze occurs. Once frozen: any change must be recorded as a new ADR, reviewed, and re-validated before the freeze record is updated — no silent edits to a frozen architecture.
