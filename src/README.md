# VEIL — Implementation Boundary

## Platform Architecture
**PRIMARY PRODUCT RUNTIME:** Chrome Extension (Manifest V3)  
**TARGET BROWSER:** Google Chrome (Desktop)  
**IMPLEMENTATION LANGUAGE:** TypeScript

> **CRITICAL RUNTIME CONSTRAINT:**  
> All module implementations under `/src/` must operate within the **Chrome Extension Manifest V3** runtime architecture (Service Worker context, Offscreen Document context, or Extension Popup UI). A standalone web application is **STRICTLY FORBIDDEN** as a replacement for any browser-agent capability. Web components outside the extension are auxiliary development tools/viewers only.

## Status
**No implementation yet.** Do NOT begin implementation ahead of the freeze sequence. As of the current revision every stage is unfrozen and every task is `BLOCKED` (`TASKS.md` §2, `STATUS.md` §2).

## Planned Module Layout (PROPOSED — not frozen; see `docs/freezes/MODULES.md`)
Mirror the module registry in `MODULES.md` once implementation begins. The `Mxx` module IDs are the stable references for tasks, branches, and file scopes.

```text
src/
  m01-core/           Browser Agent Core / Orchestrator (Service Worker)
  m02-observation/    Observation Manager (CDP / Service Worker)
  m03-visual/         Local Visual Perception (ShowUI-2B / Offscreen / WebGPU)
  m04-dom/            DOM / Accessibility Grounding (Service Worker)
  m05-ocr/            Targeted OCR (Offscreen Document)
  m06-fusion/         Perception Fusion (Service Worker)
  m07-privacy/        Local Privacy Engine (Service Worker)
  m08-sanitization/   Sanitization / Redaction (Canvas 2D / Offscreen Document)
  m09-reasoning/      Remote Reasoner Client (Service Worker fetch)
  m10-guard/          Local Action Guard (CDP BoxModel / Service Worker)
  m11-executor/       Browser Executor (CDP Input Events / Service Worker)
```

## Boundary Gate
- Workers implement **only within their module's allowed scope** (`MODULES.md`) and their assigned task (`TASKS.md`).
- No module may depend on another module's internals — only contracts from `INTERFACES.md`.
- Raw browser data never crosses the network boundary (`docs/privacy/PRIVACY-BOUNDARY.md`).
- All browser interactions must use Chrome Extension APIs (`chrome.debugger`) as specified in `DECISIONS.md`.
