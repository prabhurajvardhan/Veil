# Architecture Freeze

- **VERSION:** V0 (draft).
- **DATE:** 2026-09-14
- **STATUS:** **NOT FROZEN.**
- **AUTHORITY:** Freeze state is recorded **only** here (ADR 008, `DECISIONS.md`). A `Status: FROZEN` header on the stage document is not binding.
- **HEADER CORRECTION (Lead Architect):** The corresponding stage document previously carried a `Status: FROZEN` header that was **not** supported by this ledger, and no freeze/review/validation event exists in repository history. The header has been corrected to `NOT FROZEN`. No freeze was performed to make implementation start; the stage remains genuinely unfrozen.

- **INPUTS REVIEWED:** Project brief core loop + privacy principles; `docs/architecture/ARCHITECTURE.md`; ADRs in `DECISIONS.md`.
- **DECISIONS:** Components, LOCALE/REMOTE split, permission/perception/execution-authority separation, trust boundaries drafted. None frozen.
- **FROZEN ARTIFACTS:** None.
- **KNOWN LIMITATIONS:** No performance/hardware/latency data for ShowUI-2B; no cloud model selected; no concrete schemas for sanitized context or action proposal.
- **OPEN QUESTIONS:** See "Open Questions" in `docs/architecture/ARCHITECTURE.md`.
- **VALIDATION REQUIRED:** Architecture V1 review against `docs/requirements/REQUIREMENTS.md`; at least one additional validation pass (V2/V3) per the mandated lifecycle before this may be marked frozen.
- **CHANGE POLICY:** Not applicable until frozen. Once frozen, any change must be recorded as a new ADR, reviewed, and re-validated before the freeze record is updated — no silent edits to a frozen architecture.