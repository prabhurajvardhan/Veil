# VEIL — Git Strategy

Status: CONFIRMED prohibitions from brief; conventions PROPOSED. Based on the isolation principle: main → feature branch → implementation → validation → review → merge.

## 1. Branch Model

```
main (always stable)
  └── feature/<module-id>-<task-id>-<short-description>
        └── implementation → validation → review → merge (PR)
```

## 2. Branch Naming Convention

`feature/<module-id>-<task-id>-<short-description>`

Examples:
- `feature/M03-T017-showui-adapter`
- `feature/M05-T023-redaction-verification`

- Module IDs come from `MODULES.md` (root).
- Task IDs come from `TASKS.md`.
- [PROPOSED] Integration/staging branch between feature branches and main: [UNKNOWN — not specified].

## 3. Rules (CONFIRMED prohibitions from brief)

- No direct feature work on `main`; `main` is never a development target.
- One task per branch; one worker per task.
- Do not modify another worker's module.
- Do not mix unrelated changes.
- Do not rewrite shared history.
- Do not force-push shared branches.
- No secrets in commits, branches, or PRs.
- PR required; review required; validation required.
- Architecture changes require architectural approval (stop → ADR → revalidate → refreeze).

## 4. Commit Conventions (PROPOSED)

- Format: conventional-commit style referencing the task ID:
  `feat(M05-T023): verify sanitized output before transmission`
- Small, single-purpose commits; no giant mixed-purpose commits.
- Never commit secrets, raw fixtures of sensitive data, or screenshots containing real user data.

## 5. Pull Request Conventions

Every PR must include (CONFIRMED from brief):
- Task (task ID/reference)
- Change summary
- Files changed
- Interfaces changed
- Tests
- Security/privacy impact
- Screenshots/demo evidence where relevant
- Known limitations
- Validation status

Merge requirements: review completed; no uncoordinated changes to another module; no secrets; validation evidence attached. CI: [UNKNOWN — VALIDATION REQUIRED]. Approval count / squash-vs-merge: [UNKNOWN].

## 6. Conflict Resolution (PROPOSED)

Ownership-first: the module owner of record has final say on conflicts within their module's files; cross-module conflicts require explicit coordination between owners before merge.

## 7. Recovery and Rollback (PROPOSED)

Revert the offending merge commit on `main` rather than force-pushing over history. Reopen the associated task and route the fix through a new feature branch and PR.

## 8. Open Questions

- Integration/staging branch existence.
- CI pipeline definition.
- Approval count; squash vs merge-commit.
- Abandoned-branch staleness window.