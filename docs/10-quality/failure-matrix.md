# Failure Matrix

Status: DRAFT — most cells UNKNOWN pending design work. Structure below mirrors the ten acceptance-test scenarios in `acceptance-tests.md`.

| Component / Failure | Detection | Response | User Impact | Privacy Impact | Recovery |
|---|---|---|---|---|---|
| Local perception uncertainty | Low confidence score | UNKNOWN | UNKNOWN | Must not expose more data on uncertainty (fail closed) | UNKNOWN |
| Cloud proposes invalid action | Action validation fails schema/authorization check | Action rejected, not executed | UNKNOWN | None (rejected before execution) | UNKNOWN |
| Page changes before execution | Staleness check in action validation | Re-observe / re-validate | UNKNOWN | None if caught | UNKNOWN |
| Model/runtime unavailable | Network/timeout error | UNKNOWN | UNKNOWN | None (no data sent) | UNKNOWN |
| Browser action failure | Execution layer error | UNKNOWN | UNKNOWN | None expected | UNKNOWN |
| Privacy detection uncertain | Confidence below threshold (threshold: UNKNOWN) | Fail closed, no transmission | UNKNOWN | Protected by design | UNKNOWN |

All UNKNOWN cells require dedicated design and validation work; do not fill them with invented specifics.
