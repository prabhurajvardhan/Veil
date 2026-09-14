# VEIL — Scope

## V1 In Scope
CONFIRMED (from "V1 Technical Priority"):
- Single end-to-end task loop: task → observe → local perception (ShowUI-2B) → privacy sanitization → cloud reasoning → local action validation → execution → re-observation → verification.
- Local visual grounding via ShowUI-2B.
- Local privacy detection and sanitization prior to any network transmission.
- Structured (not prose) sanitized context sent to the cloud reasoning model.
- Local validation of every proposed action prior to execution.

## V1 Out of Scope
CONFIRMED (explicitly marked FUTURE/PROPOSED in brief unless required for the working loop):
- Adaptive inference / dynamic model selection.
- Advanced token reduction strategies.
- Sophisticated perception policies beyond what V1's loop requires.
- Multi-model routing.
- Advanced reconstruction-attack defense research.
- Research-grade optimization work.

## Future Scope
PROPOSED, not committed: expanded browser/OS support, multiple reasoning-model backends, the FUTURE items above once V1 is validated.

## Anti-Scope-Creep Rules
CONFIRMED (from brief): "Do NOT allow advanced features to delay the working loop." Any feature not required for the minimum working V1 loop must be explicitly labeled FUTURE/PROPOSED and deferred past V1 release.
