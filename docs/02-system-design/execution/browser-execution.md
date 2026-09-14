# Browser Execution

## Purpose
Execute a validated action against the live browser, then trigger re-observation.

## Preconditions
CONFIRMED: only actions that have passed `action-validation.md` may reach this stage.

## Stale-State Protection
PROPOSED: execution should re-check the target element/page state immediately before acting, in addition to the validation-time check, to narrow the window for stale-state execution.

## Re-observation
CONFIRMED: execution is always followed by a fresh observation, restarting the pipeline (see `../complete-data-pipeline.md`) so the result can be verified.

## Failure Modes
- UNKNOWN — browser-level execution failures (element not found, action rejected by page, etc.) not yet enumerated. See `10-quality/acceptance-tests.md` scenario 9 ("Browser action failure").
