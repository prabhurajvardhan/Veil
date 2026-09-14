# Architecture Freeze

- **VERSION:** V0 (draft).
- **DATE:** 2026-09-14
- **STATUS:** **NOT FROZEN.**
- **INPUTS REVIEWED:** Project brief core loop + privacy principles; `docs/architecture/ARCHITECTURE.md`; ADRs in `DECISIONS.md`.
- **DECISIONS:** Components, LOCALE/REMOTE split, permission/perception/execution-authority separation, trust boundaries drafted. None frozen.
- **FROZEN ARTIFACTS:** None.
- **KNOWN LIMITATIONS:** No performance/hardware/latency data for ShowUI-2B; no cloud model selected; no concrete schemas for sanitized context or action proposal.
- **OPEN QUESTIONS:** See "Open Questions" in `docs/architecture/ARCHITECTURE.md`.
- **VALIDATION REQUIRED:** Architecture V1 review against `docs/requirements/REQUIREMENTS.md`; at least one additional validation pass (V2/V3) per the mandated lifecycle before this may be marked frozen.
- **CHANGE POLICY:** Not applicable until frozen. Once frozen, any change must be recorded as a new ADR, reviewed, and re-validated before the freeze record is updated — no silent edits to a frozen architecture.