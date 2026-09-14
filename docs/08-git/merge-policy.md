# Merge Policy

## When a Branch May Merge
PROPOSED (derived from prohibitions in `git-strategy.md` and PR requirements in `pull-request-strategy.md`):
- PR template fully completed, including security/privacy impact.
- Review completed by the assigned Reviewer role (`09-team/role-definitions.md`).
- No modification to another employee's module without documented coordination.
- No secrets present.
- CI validation passed — UNKNOWN, since no CI pipeline is defined yet; VALIDATION REQUIRED before this criterion can be enforced.

## Open Questions
- UNKNOWN: whether merges require a specific number of approvals, or squash vs. merge-commit policy.
