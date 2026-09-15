# VEIL — Module Registry

**Status:** FROZEN  
**Authority:** Derived from `docs/architecture/ARCHITECTURE.md` and `docs/system-design/SYSTEM-DESIGN.md`.

All VEIL modules operate within the **Chrome Extension Manifest V3** architecture. No module may be implemented as or relocated to a standalone web application.

---

## M01: Browser Agent Core / Orchestrator
- **Runtime:** Chrome Extension Service Worker Context (`background.js`).
- **Owns:** Extension lifecycle, state machine transitions (IDLE, OBSERVING, AUTHORIZING, REASONING, EXECUTING, VERIFYING, RECOVERY), loop coordination, and end-to-end task verification.
- **Does Not Own:** Direct raw observation capture, visual model inference, privacy rules, cloud reasoning, or browser event dispatching.
- **Network Boundary:** Strictly Local. Does not make external network calls directly.
- **Browser Boundary:** Indirect control through M02 and M11; manages extension tab state.
- **Inputs:** User Task Goal, `ExecutionResult`, `VerificationResult`.
- **Outputs:** Lifecycle triggers for M02, M09, M10.
- **Dependencies:** M02, M09, M10, M11.
- **Allowed Files:** `/src/m01-core/*`, `manifest.json`, `vite.config.ts`
- **Forbidden Files:** Any file outside `/src/m01-core/` (unless extension build configuration).
- **Related Tasks:** T001, T002, T015.
- **Integration Milestones:** M0, M1, M5.

---

## M02: Observation Manager
- **Runtime:** Chrome Extension Service Worker Context (`background.js`).
- **Owns:** Deterministic capture of raw browser state via Chrome DevTools Protocol (`chrome.debugger` API). Captures screenshots, complete DOM trees, and accessibility trees.
- **Does Not Own:** Visual model inference, DOM grounding/parsing, OCR extraction, privacy classification, or redaction.
- **Network Boundary:** Strictly Local. Raw observations must NEVER cross the network boundary.
- **Browser Boundary:** Direct Read-Only CDP connection to the active Chrome tab.
- **Inputs:** Observation trigger from M01.
- **Outputs:** `RawObservation` record.
- **Dependencies:** Chrome Extension `chrome.debugger` API.
- **Allowed Files:** `/src/m02-observation/*`
- **Forbidden Files:** Any file outside `/src/m02-observation/*`.
- **Related Tasks:** T003, T004.
- **Integration Milestones:** M1.

---

## M03: Local Visual Perception
- **Runtime:** Chrome Extension Offscreen Document Context (with WebGPU/WASM acceleration).
- **Owns:** On-device execution of ShowUI-2B model. Computes normalized bounding boxes, visual element classes, and confidence scores from raw screenshots.
- **Does Not Own:** DOM or accessibility tree processing, OCR text extraction, perception fusion, or privacy assessment.
- **Network Boundary:** Strictly Local. Inference runs 100% on-device; no data crosses to the cloud.
- **Browser Boundary:** None. Operates purely on image memory passed from M02.
- **Inputs:** `RawObservation.screenshot`.
- **Outputs:** `VisualEvidence` record.
- **Dependencies:** ONNX Runtime Web / WebGPU.
- **Allowed Files:** `/src/m03-visual/*`
- **Forbidden Files:** Any file outside `/src/m03-visual/*`.
- **Related Tasks:** T005.
- **Integration Milestones:** M2.

---

## M04: DOM / Accessibility Grounding
- **Runtime:** Chrome Extension Service Worker Context.
- **Owns:** Parsing and grounding of CDP DOM trees and accessibility AXNode trees. Computes BackendNodeIds, element bounding boxes, accessible roles, and interactability states.
- **Does Not Own:** Visual VLM model inference, multi-modal fusion, OCR extraction, or DOM mutation.
- **Network Boundary:** Strictly Local.
- **Browser Boundary:** Read-Only inspection of CDP trees passed from M02.
- **Inputs:** `RawObservation.dom_tree`, `RawObservation.a11y_tree`.
- **Outputs:** `DomEvidence` record.
- **Dependencies:** CDP DOM and Accessibility schemas.
- **Allowed Files:** `/src/m04-dom/*`
- **Forbidden Files:** Any file outside `/src/m04-dom/*`.
- **Related Tasks:** T006.
- **Integration Milestones:** M2.

---

## M05: Targeted OCR
- **Runtime:** Chrome Extension Offscreen Document Context.
- **Owns:** High-accuracy local optical character recognition on cropped screenshot regions lacking DOM text representations.
- **Does Not Own:** Global visual object detection, DOM parsing, or perception fusion.
- **Network Boundary:** Strictly Local. Engine must run completely on-device without cloud API calls.
- **Browser Boundary:** None.
- **Inputs:** Cropped image regions from `RawObservation.screenshot`.
- **Outputs:** `OcrEvidence` record.
- **Dependencies:** Local OCR Engine (TBD — requires explicit architecture/system-design decision).
- **Allowed Files:** `/src/m05-ocr/*`
- **Forbidden Files:** Any file outside `/src/m05-ocr/*`.
- **Related Tasks:** T007.
- **Integration Milestones:** M2.

---

## M06: Perception Fusion
- **Runtime:** Chrome Extension Service Worker Context.
- **Owns:** Spatial reconciliation (IoU matching) across Visual, DOM, and OCR evidence. Deterministic `target_id` generation (`SHA-256(DOM_XPath + BackendNodeId)`). Conflict resolution and confidence scoring.
- **Does Not Own:** Privacy classification, raw data capture, or cloud communication.
- **Network Boundary:** Strictly Local.
- **Browser Boundary:** None. Pure computational fusion.
- **Inputs:** `VisualEvidence` (M03), `DomEvidence` (M04), `OcrEvidence` (M05).
- **Outputs:** Canonical `PerceptionResult` record.
- **Dependencies:** None (Pure TypeScript algorithms).
- **Allowed Files:** `/src/m06-fusion/*`
- **Forbidden Files:** Any file outside `/src/m06-fusion/*`.
- **Related Tasks:** T008, T009.
- **Integration Milestones:** M2.

---

## M07: Local Privacy Engine
- **Runtime:** Chrome Extension Service Worker Context.
- **Owns:** Deterministic, fail-closed classification of sensitive on-screen data (PII regex rules, credit cards, SSNs, credentials, passwords). Produces list of target IDs requiring redaction.
- **Does Not Own:** Image manipulation or visual canvas redaction (M08), network transmission, or action execution.
- **Network Boundary:** Strictly Local. Forbidden from initiating any network transmission.
- **Browser Boundary:** None. Inspects `PerceptionResult`.
- **Inputs:** Canonical `PerceptionResult` from M06.
- **Outputs:** `PrivacyAssessment` record.
- **Dependencies:** Regex rules and DOM role catalogs.
- **Allowed Files:** `/src/m07-privacy/*`
- **Forbidden Files:** Any file outside `/src/m07-privacy/*`.
- **Related Tasks:** T010.
- **Integration Milestones:** M3.

---

## M08: Sanitization / Redaction
- **Runtime:** Chrome Extension Offscreen Document Context.
- **Owns:** Irreversible visual masking of screenshots (rendering opaque `#000000` rectangles over sensitive bounding boxes via Canvas 2D) and structural text scrub (`[REDACTED]`). Enforces the strict privacy boundary before data egress.
- **Does Not Own:** Privacy sensitivity policy definition (M07) or network transport (M09).
- **Network Boundary:** Enforces the privacy egress boundary.
- **Browser Boundary:** None. Operates on local image buffers and structured trees.
- **Inputs:** `PerceptionResult` (M06), `PrivacyAssessment` (M07).
- **Outputs:** `SanitizedObservation` record.
- **Dependencies:** HTML5 Canvas 2D API.
- **Allowed Files:** `/src/m08-sanitization/*`
- **Forbidden Files:** Any file outside `/src/m08-sanitization/*`.
- **Related Tasks:** T011.
- **Integration Milestones:** M3.

---

## M09: Remote Reasoner Gateway
- **Runtime:** Chrome Extension Service Worker Context (Client) communicating with Remote Cloud Environment (Backend).
- **Owns:** Encrypted HTTPS transmission of `SanitizedObservation` and user goal to the Cloud LLM Reasoner via native `fetch()`. Validates response against the declarative `ActionProposal` schema.
- **Does Not Own:** Local perception, privacy sanitization, or browser action execution.
- **Network Boundary:** Egress/Ingress across the privacy boundary. Permitted to transmit ONLY `SanitizedObservation`.
- **Browser Boundary:** Zero direct browser access or execution authority.
- **Inputs:** `SanitizedObservation` from M08, User Goal.
- **Outputs:** Declarative `ActionProposal` record.
- **Dependencies:** Native Service Worker `fetch()`, Cloud LLM Endpoint (TBD).
- **Allowed Files:** `/src/m09-reasoning/*`
- **Forbidden Files:** Any file outside `/src/m09-reasoning/*`.
- **Related Tasks:** T012.
- **Integration Milestones:** M4.

---

## M10: Local Action Guard
- **Runtime:** Chrome Extension Service Worker Context.
- **Owns:** Independent client-side validation of every incoming `ActionProposal`. Evaluates observation staleness (age <= 2000ms), queries CDP `DOM.getBoxModel` to ensure element exists and has not shifted (> 5px), and resolves `$CREDENTIAL` tokens from local extension storage.
- **Does Not Own:** Remote model reasoning or physical browser event dispatching.
- **Network Boundary:** Strictly Local.
- **Browser Boundary:** Read-Only inspection via CDP `DOM.getBoxModel`.
- **Inputs:** `ActionProposal` from M09.
- **Outputs:** `ValidatedAction` record.
- **Dependencies:** `chrome.debugger` (`DOM.getBoxModel`), `chrome.storage.local`.
- **Allowed Files:** `/src/m10-guard/*`
- **Forbidden Files:** Any file outside `/src/m10-guard/*`.
- **Related Tasks:** T013.
- **Integration Milestones:** M5.

---

## M11: Browser Executor
- **Runtime:** Chrome Extension Service Worker Context.
- **Owns:** Dispatching trusted, OS-level hardware input events (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`) into the active browser tab via `chrome.debugger` to execute locally validated actions.
- **Does Not Own:** Action validation, planning, or state machine lifecycle.
- **Network Boundary:** Strictly Local.
- **Browser Boundary:** Direct Hardware-Level Event Dispatch via CDP into the active tab.
- **Inputs:** `ValidatedAction` from M10.
- **Outputs:** `ExecutionResult` record returned to M01.
- **Dependencies:** `chrome.debugger` API.
- **Allowed Files:** `/src/m11-executor/*`
- **Forbidden Files:** Any file outside `/src/m11-executor/*`.
- **Related Tasks:** T014.
- **Integration Milestones:** M5.
