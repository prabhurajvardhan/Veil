# VEIL — Engineering Documentation System

## What This Is
This is the engineering source-of-truth documentation for VEIL, structured per the Engineering Delivery Lifecycle (see `07-delivery/development-strategy.md`). It was generated from the project brief with **no prior repository content to draw on** — the GitHub repo was confirmed empty at the time of writing.

## Current Status: Phase 1 (Requirements), unfrozen
Almost everything in this tree is **DRAFT / PROPOSED / labeled UNKNOWN** where the brief did not specify a concrete answer. Nothing has passed the required freeze process yet:

- Requirements: drafted, **not frozen** → `freezes/requirements-freeze.md`
- Architecture: V0 draft, **not frozen** → `01-architecture/architecture-freeze.md`
- System Design: V0 draft, **not frozen** → `02-system-design/system-design-freeze.md`
- Modules: classified, **not frozen** → `06-modules/module-freeze.md`
- Sprint Planning / Team Allocation / Implementation: **not started**

## How to Read the Labels
Every document uses these markers consistently:
- **CONFIRMED** — stated explicitly in the project brief, or verified directly (e.g., the repo being empty).
- **PROPOSED** — an engineering decision being suggested, not yet agreed or validated.
- **ASSUMPTION** — a temporary assumption made to keep documentation moving.
- **UNKNOWN** / **VALIDATION REQUIRED** — genuinely not yet established. Nothing here should be treated as fact just because it's written down.

No benchmarks, performance numbers, hardware requirements, team member names, or API contracts have been invented anywhere in this tree — where the brief didn't supply them, they're marked UNKNOWN.

## Where to Start
1. Read `00-project/` for what VEIL is and its scope.
2. Read `01-architecture/architecture.md` for the system shape.
3. Review and formally close out `freezes/requirements-freeze.md` with the team before anyone treats architecture or system design as stable.
4. Do not begin implementation ahead of the freeze sequence in `07-delivery/development-strategy.md` — the brief is explicit about this.

## Directory Map
See the full tree in the repository under `docs/`. Each numbered folder corresponds to one phase or concern area (00-project, 01-architecture, 02-system-design, 03-concepts, 04-state, 05-engineering, 06-modules, 07-delivery, 08-git, 09-team, 10-quality, freezes).
