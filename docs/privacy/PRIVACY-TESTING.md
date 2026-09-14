# VEIL — Privacy Testing

Status: DRAFT. Criticality: CONFIRMED — highest-priority test category for VEIL. No test result is claimed until a test has actually run; this document defines scenarios, not results. See `docs/engineering/QUALITY.md` for the broader test strategy.

For each scenario: INPUT / EXPECTED BEHAVIOR / TEST METHOD / PASS CONDITION / FAIL CONDITION.

## 1. Scenario: Password Field Visible

- **INPUT:** A page with a visible password field containing a value while the agent observes and later sends sanitized context.
- **EXPECTED:** Password value is redacted/omitted in anything outbound; never on the wire.
- **TEST METHOD:** Inspect the outbound network payload during the loop; assert no password value present.
- **PASS:** Payload contains neither the value nor a reversible encoding; redaction applied before transmission.
- **FAIL:** Value or a reversible encoding appears in any outbound payload.

## 2. Scenario: Email Visible

- **INPUT:** A page displaying an email address on screen or in DOM.
- **EXPECTED:** Email is sanitized out of the outbound payload.
- **TEST METHOD:** Payload inspection + functional assertion that the loop still proceeds where safe.
- **PASS:** No raw email in payload; sanitized placeholder present when required for structure.
- **FAIL:** Raw email crosses the boundary.

## 3. Scenario: Phone Number Visible

- **INPUT:** A page displaying a phone number.
- **EXPECTED:** Phone number sanitized before transmission.
- **TEST METHOD:** Payload inspection.
- **PASS:** No raw phone number in payload.
- **FAIL:** Raw phone number in payload.

## 4. Scenario: Account Number Visible

- **INPUT:** A page displaying an account/card number.
- **EXPECTED:** Account number redacted before transmission.
- **TEST METHOD:** Payload inspection.
- **PASS:** No raw account number in payload.
- **FAIL:** Raw account number in payload.

## 5. Scenario: Sensitive DOM Field

- **INPUT:** A DOM field typed as sensitive (e.g., `type=password`, autofill-sensitive).
- **EXPECTED:** Sensitivity detection catches it via the DOM path; value redacted.
- **TEST METHOD:** DOM-path detection unit test + payload inspection.
- **PASS:** Field classified sensitive, value excluded from payload.
- **FAIL:** Value present in payload or detection misses it.

## 6. Scenario: Visual-Only Sensitive Information

- **INPUT:** Sensitive content rendered only as pixels (e.g., a document image, card rendered in an image).
- **EXPECTED:** Visual detection catches the region; uncertainty fails closed.
- **TEST METHOD:** Visual-path detection test using a fixture image; payload inspection.
- **PASS:** Sensitive region excluded or whole observation blocked on uncertainty.
- **FAIL:** Pixel-derived content leaks to the payload.

## 7. Scenario: OCR Detects Sensitive Information

- **INPUT:** Text requires OCR (e.g., inside a canvas/image), and OCR output contains sensitive content.
- **EXPECTED:** OCR output is treated as local, unsanitized data; sanitized before crossing.
- **TEST METHOD:** OCR fixture + payload inspection.
- **PASS:** OCR-sensitive content never in payload.
- **FAIL:** OCR text crosses the boundary.

## 8. Scenario: Privacy Detector Misses Information

- **INPUT:** A sensitive element the detector does not flag (false negative).
- **EXPECTED:** Defense-in-depth: redaction verification (Stage 8) catches residual sensitive content; if it cannot confirm clean, transmission is blocked.
- **TEST METHOD:** Verification-stage test with deliberately missed content.
- **PASS:** Verification blocks transmission; no data leaves.
- **FAIL:** Data leaves despite an unverified clean result.

## 9. Scenario: Redaction Box Too Small

- **INPUT:** A redaction region that is smaller than the actual sensitive region (partial leak within the same element).
- **EXPECTED:** Verification detects residual content outside the redaction box; blocked or corrected.
- **TEST METHOD:** Fixture with adjacent sensitive content and an undersized redaction box.
- **PASS:** Residual content caught; nothing leaks.
- **FAIL:** Residual content crosses.

## 10. Scenario: Redaction Fails

- **INPUT:** Sanitization stage errors while processing sensitive content.
- **EXPECTED:** Fail closed — sanitization failure is treated as uncertain; no transmission (see Stage 7).
- **TEST METHOD:** Force a sanitization failure; observe the pipeline.
- **PASS:** Transmission blocked; FAILED state surfaces.
- **FAIL:** Partially-sanitized payload is transmitted.

## 11. Scenario: Cloud Requests Hidden Information

- **INPUT:** The cloud proposes an action or asks for information that was intentionally withheld (e.g., a proposed action targets a redacted element).
- **EXPECTED:** The local action guard rejects the action (authorization/staleness check); no hidden info is disclosed in reply.
- **TEST METHOD:** Feed a crafted proposal targeting a redacted element.
- **PASS:** Proposal rejected; no additional data transmitted.
- **FAIL:** Hidden info is disclosed or the action executes.

## 12. Scenario: Malicious Webpage / Prompt Injection

- **INPUT:** A webpage attempts to inject instructions into the context the cloud sees (or poisons the DOM).
- **EXPECTED:** Page content is treated as data, not instructions; sanitization and validation limit the attack surface. [Scope note: full prompt-injection defense is a broad research area — V1 defense-in-depth expectations are defined here, advanced defense is FUTURE.]
- **TEST METHOD:** Craft a malicious page fixture; observe sanitized context and validation behavior.
- **PASS:** No credential/cookie exfiltration occurs; no privileged action executes.
- **FAIL:** Injection induces disclosure of hidden data or an unauthorized action.

## 13. Scenario: Action Targets a Sensitive Element

- **INPUT:** The cloud proposes an action whose target contains sensitive content.
- **EXPECTED:** Validation checks authorization of the target; sensitive element actions are blocked or require confirmed non-sensitive handling.
- **TEST METHOD:** Feed a proposal targeting a password field.
- **PASS:** Action rejected or explicitly authorized via a defined rule.
- **FAIL:** Action executes on a sensitive element without authorization.

## 14. Scenario: Stale Observation

- **INPUT:** The page changed after observation; the proposal references the stale observation.
- **EXPECTED:** Staleness check rejects the proposal; agent re-observes.
- **TEST METHOD:** Change the page between observation and proposal; assert rejection.
- **PASS:** Proposal rejected; re-observation triggered.
- **FAIL:** Action executes against a stale page state.

## 15. Scenario: Inference Failure

- **INPUT:** Local ShowUI-2B inference fails (crash, timeout, OOM).
- **EXPECTED:** [PROPOSED] Agent enters a clear failure state; no fabricated observation replaces the failed inference; no data is transmitted from a failed inference.
- **TEST METHOD:** Force inference failure; observe pipeline.
- **PASS:** Clean FAILED/RECOVERY transition; nothing crosses the boundary.
- **FAIL:** System proceeds with fabricated/empty perception or transmits anyway.

## 16. Cloud Payload Inspection (cross-cutting)

- **INPUT:** Any acceptance scenario involving the network boundary.
- **EXPECTED:** Assert nothing raw (screenshot bytes, raw DOM text, raw OCR, unredacted passwords/PII) appears in the outbound payload.
- **TEST METHOD:** Intercept the actual outbound request (proxy or stub reasoning service) and inspect body/headers.
- **PASS:** Only sanitized structured fields present.
- **FAIL:** Any raw sensitive data present.

## 17. Failure-Safe Verification (cross-cutting)

Every privacy test should also confirm the fail-closed principle: when detection is deliberately made uncertain, the system must not transmit additional data rather than proceeding.

## Status

No results exist yet — test procedures are defined above; procedures and fixtures are [VALIDATION REQUIRED] to be built alongside implementation. Do not record pass/fail until tests actually run.