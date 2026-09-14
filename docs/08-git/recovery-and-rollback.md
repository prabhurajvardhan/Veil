# Recovery and Rollback

## Broken Integration Recovery
PROPOSED: revert the offending merge commit on `main` rather than force-pushing over history (force-pushing shared branches is explicitly prohibited). Re-open the associated task and route the fix through a new feature branch and PR.

## Open Questions
- UNKNOWN: specific rollback tooling/process, incident communication protocol — not yet defined.
