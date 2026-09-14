# VEIL — Employee File (Template)

Create one file per employee (e.g., `docs/employees/EMP-01.md`) only when an actual employee/worker is assigned. Do not invent names; use IDs if names are unknown. This file is the template and is intentionally empty of assignments.

```markdown
# Employee: <ID>

- **EMPLOYEE ID:** <EMP-xx>
- **ROLE:** <Role per docs/engineering/WORKFLOW.md role definitions, e.g., Module Owner / AI Coding Employee / Reviewer>
- **MODULE:** <Mxx from MODULES.md — one primary module>
- **CURRENT TASK:** <TASK ID from TASKS.md — one active task at a time>
- **ALLOWED SCOPE:** <Module's allowed files per MODULES.md; exact paths>
- **FORBIDDEN SCOPE:** <Everything else: other modules' files, architecture, interfaces, freeze records>
- **REQUIRED DOCUMENTS:** README.md, STATUS.md, REQUIREMENTS.md, ARCHITECTURE.md, MODULES.md, INTERFACES.md, DECISIONS.md, this file, the assigned task
- **INTERFACES:** <Contract IDs this employee's module produces/consumes, per INTERFACES.md>
- **DEPENDENCIES:** <Modules/tasks this work depends on, per MODULES.md and TASKS.md>
- **VALIDATION REQUIREMENTS:** <Tests to run per QUALITY.md / PRIVACY-TESTING.md / TASKS.md acceptance criteria>
- **HANDOFF RULES:** Update TASKS.md and STATUS.md; open a PR per GIT-STRATEGY.md; record what was completed, what remains, and known issues.
```

## Boundary Rules (apply to every employee)

The employee must never change — without explicit authorization through the project's decision process (ADR + review + re-freeze):

- the **architecture** (`docs/architecture/`),
- **module boundaries** (`MODULES.md`),
- **interfaces** (`INTERFACES.md`),
- **another employee's module**.

## Roles (PROPOSED, from prior `09-team/role-definitions.md`)

- **Principal Architect** — owns architecture and system design documentation; resolves cross-module architectural conflicts.
- **Module Owner** — owns one or more modules; final say on conflicts within their module.
- **Reviewer** — reviews PRs before merge.
- **Integration Owner** — responsible for integration strategy.
- **QA / Validation** — owns execution of quality, privacy, and acceptance tests.
- **AI Coding Employee** — implements assigned tasks within branch/module boundaries without modifying other modules without coordination.

Team structure: CONFIRMED six-person engineering structure; member names are UNKNOWN — do not invent.