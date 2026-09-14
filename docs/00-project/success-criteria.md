# VEIL — Success Criteria

## V1 Acceptance Criteria
CONFIRMED (derived from V1 minimum loop): The system is considered V1-complete when it can, for at least one real browser task:
1. Accept a task.
2. Observe the page.
3. Run ShowUI-2B locally to get visual grounding.
4. Detect and sanitize sensitive content before sending anything over the network.
5. Send only sanitized context to the cloud reasoning model.
6. Receive and locally validate a proposed action.
7. Execute the action in the browser.
8. Re-observe and verify the result.

Also see `10-quality/acceptance-tests.md` for the ten required end-to-end scenarios.

## Technical Success Criteria
UNKNOWN — no measurable technical thresholds (latency, accuracy, throughput) have been specified. VALIDATION REQUIRED before these can be defined; do not fabricate numbers.

## Privacy Success Criteria
PROPOSED, pending validation via `10-quality/privacy-testing.md`:
- No raw sensitive visual/DOM data observed on the wire during any acceptance test.
- Every acceptance-test scenario involving sensitive/PII/password content shows sanitization applied before transmission.
- Privacy-uncertain cases fail closed (no execution, no additional data exposure) rather than proceeding.

## End-to-End Success Criteria
CONFIRMED (qualitative, from core loop): A user task is observably completed via the full closed loop (observe → act → re-observe → verify) without the cloud reasoning model ever having received unredacted sensitive content.

## Metrics That Are Actually Defined
None yet. UNKNOWN / VALIDATION REQUIRED for all quantitative metrics (accuracy %, latency, false-negative rate on privacy detection, etc.). Do not report any such number until it has actually been measured.
