# VEIL — Privacy Boundary

Status: DRAFT (PROPOSED enforcement; principles CONFIRMED from brief). This is one of VEIL's strongest documents. See `docs/system-design/SYSTEM-DESIGN.md` Stages 6–10 for the implementing pipeline stages.

## 1. Core Rule

**When uncertain, VEIL protects privacy rather than disclosing additional information.** Uncertainty fails closed (PRIV-007). A privacy miss is a product failure; a blocked action on uncertain data is a correct default.

## 2. Where Data Is Created and Processed

| Data | Created in | Processed in | May cross network? |
|---|---|---|---|
| Raw screenshot | Local (M02) | Local only (M03) | **NEVER** |
| DOM/A11y snapshot | Local (M02) | Local only (M02/M04) | **NEVER as raw dump** |
| Raw OCR output | Local (M04, conditional) | Local only | **NEVER** |
| Visual grounding result | Local (M03) | Local only (M04) | **NEVER** |
| Fused perception result | Local (M04) | Local only (M05) | **NEVER** |
| Sensitivity classification | Local (M05) | Local only (M05) | **NEVER** |
| Sanitized observation | Local (M05) | Local only (M06) | **NEVER as-is** |
| **Sanitized context** | Local (M06) | Local + remote | **ONLY crossable data** |
| **Action proposal (inbound)** | Remote (reasoning service) | Local (M08 validation) | Inbound only, untrusted until validated |

## 3. Data-Specific Boundary Rules

| Item | Rule | Status |
|---|---|---|
| **Raw screenshot** | Must never cross; used only for local perception. | CONFIRMED (ADR-008) |
| **Raw OCR** | Must never cross; OCR output is unsanitized and local-only. | CONFIRMED by PRIV-001 scope; PROPOSED mechanism |
| **Passwords** | Never cross. Password field content must be omitted/redacted before any outbound payload. | CONFIRMED (PRIV-001; acceptance scenario 3) |
| **Tokens / credentials** | Never cross. Treated as sensitive; fail closed on uncertainty. | CONFIRMED principle; mechanism PROPOSED |
| **Cookies / session data** | Never cross. Session material is device-only. | CONFIRMED principle; mechanism PROPOSED |
| **PII (email, phone, account number, name)** | Must be sanitized before crossing. Generalization may be allowed when omission would break reasoning [PROPOSED]. | PROPOSED rules; VALIDATION REQUIRED |
| **Sensitive DOM values** | Detected via DOM path and redacted. | CONFIRMED requirement (PRIV-001, REQ-005) |
| **Visual-only sensitive information** (e.g., document in an image) | Detected via visual path; if uncertain → fail closed. | CONFIRMED principle; detection coverage VALIDATION REQUIRED |
| **Task text** (user-typed) | [UNKNOWN] Whether in-scope for sanitization — VALIDATION REQUIRED. | UNKNOWN |

## 4. What May Cross the Network (complete list)

1. **Sanitized context** (outbound) — structured, field-level, post-sanitization and post-verification. No raw pixels, no raw DOM, no raw OCR.
2. **Action proposal** (inbound) — structured, treated as untrusted until validated (SEC-002).

Nothing else. If it is not on this list, it does not cross. [CONFIRMED by PRIV-002/003]

## 5. What Must Never Cross

- Raw screenshots and any derived pixel data.
- Raw DOM/accessibility dumps.
- Raw OCR output.
- Unredacted perception results.
- Pre-sanitization agent state.
- Passwords, tokens, cookies, session data.
- Any content for which sanitization could not be verified.

## 6. What Happens When Detection Is Uncertain

1. The affected element/region is classified as sensitive (fail closed, PRIV-007).
2. It is sanitized as if sensitive.
3. Redaction verification must confirm the result is clean.
4. If verification cannot confirm clean, transmission is **blocked entirely** (fail-closed gate 2).
5. UNKNOWN stays UNKNOWN — never coerced to "not observed" or "false" (PRIV-006).
6. Reduced local compute must reduce capability, not privacy (PRIV-008).

## 7. Invariants

- **INV-1** (CONFIRMED): No outbound payload field may contain content that failed sanitization/verification.
- **INV-2** (CONFIRMED): Any code path that transmits data must be traceable to having passed through privacy-engine verification.
- **INV-3** (CONFIRMED): The cloud never receives execution authority; the local action guard is the sole execution gate (PRIV-004/005).
- **INV-4** (CONFIRMED): UNKNOWN, OBSERVED, and NOT-OBSERVED are three distinct states, preserved throughout the pipeline.

## 8. Enforcement Points

- **M05** (privacy engine): detection + sanitization + redaction verification — the enforcing module.
- **M06** (sanitized context): the only builder of cross-boundary payloads.
- **M07** (reasoning gateway): the only network egress — enforcement via single-egress [PROPOSED].
- **Network payload inspection** in privacy tests (`PRIVACY-TESTING.md`): the external check that nothing raw is on the wire.

## 9. Open Questions

- [UNKNOWN] Exact per-sensitivity-type transformation rules.
- [UNKNOWN] Extension permission model.
- [UNKNOWN] Whether task text is in-scope for sanitization.
- [UNKNOWN] Formal threat model / adversary assumptions.
- [UNKNOWN] Logging/telemetry policy under privacy constraints.