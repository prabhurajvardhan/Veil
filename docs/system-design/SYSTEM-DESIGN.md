# VEIL — System Design Specification

**Status:** FROZEN  
**Purpose:** Detailed operational specifications and exact runtime execution contexts for all VEIL modules.

---

## 1. Runtime Environment Map

All VEIL components execute within one of the following four explicitly defined runtime contexts:

1. **Chrome Extension Service Worker Context (`background.js`):** The primary headless control thread for the extension under Manifest V3.
2. **Chrome Extension Offscreen Document Context (`offscreen.html`):** A headless DOM/Canvas/WebGPU-capable document created via `chrome.offscreen.createDocument` to execute tasks unsupported in Service Workers (such as Canvas 2D image pixel manipulation and WebGPU inference).
3. **Browser Page Context:** The live DOM and render process of the user's active Google Chrome tab.
4. **Remote Cloud Environment:** External cloud API infrastructure reachable only via outbound encrypted HTTPS requests.

---

## 2. Module Specifications & Execution Contexts

### M01: Browser Agent Core / Orchestrator
- **RUNTIME LOCATION:** Chrome Extension Service Worker Context.
- **INPUT:** User task goal (initiated from Extension Action Popup or Options page).
- **EXACT TECHNOLOGY:** TypeScript finite state machine running in the Manifest V3 background service worker.
- **PROCESSING:** Orchestrates the closed-loop agent lifecycle across states: `IDLE` → `OBSERVING` → `AUTHORIZING` → `REASONING` → `EXECUTING` → `VERIFYING` → `COMPLETED` / `RECOVERY` / `ABORTED`.
- **VALIDATION:** Strictly verifies that state transitions follow the DAG and that no state (e.g., privacy authorization or action validation) is bypassed.
- **FAILURE / RECOVERY:** On unrecoverable errors or 3 consecutive verification failures, aborts execution and alerts the user.

---

### M02: Observation Manager
- **RUNTIME LOCATION:** Chrome Extension Service Worker Context.
- **INPUT:** Observation trigger signal from M01.
- **EXACT TECHNOLOGY:** Chrome DevTools Protocol (`chrome.debugger` API attached to the active tab).
- **PROCESSING:** Captures raw browser state through three simultaneous CDP calls:
  1. `Page.captureScreenshot` (format: 'png' or 'webp').
  2. `DOM.getDocument` (depth: -1, pierce: true to capture Shadow DOM).
  3. `Accessibility.getFullAXTree`.
- **OUTPUT:** `RawObservation` interface record.
- **FAILURE / RECOVERY:** If `chrome.debugger` detaches unexpectedly, re-attaches once. If attachment fails, halts and transitions M01 to `RECOVERY`.

---

### M03: Local Visual Perception
- **RUNTIME LOCATION:** Chrome Extension Offscreen Document Context (supports WebGPU and Web Workers).
- **INPUT:** `RawObservation.screenshot` from M02.
- **EXACT TECHNOLOGY:** ShowUI-2B executed locally via ONNX Runtime Web / WebGPU.
- **PROCESSING:** Processes visual screenshot tensor, identifies UI interactable elements, and generates normalized bounding boxes and semantic labels.
- **OUTPUT:** `VisualEvidence` interface record.
- **FAILURE / RECOVERY:** If WebGPU allocation fails, attempts fallback to WASM/CPU backend or signals degraded confidence to M06.

---

### M04: DOM / Accessibility Grounding
- **RUNTIME LOCATION:** Chrome Extension Service Worker Context.
- **INPUT:** `RawObservation.dom_tree` and `RawObservation.a11y_tree` from M02.
- **EXACT TECHNOLOGY:** Pure TypeScript DOM/A11y tree traversal engine.
- **PROCESSING:** Traverses CDP node hierarchy, filters invisible nodes, maps BackendNodeIds to bounding boxes and accessible roles, and determines interactability.
- **OUTPUT:** `DomEvidence` interface record.
- **FAILURE / RECOVERY:** If DOM tree is truncated or corrupted, fails closed with an empty node set, alerting M06.

---

### M05: Targeted OCR
- **RUNTIME LOCATION:** Chrome Extension Offscreen Document Context.
- **INPUT:** `RawObservation.screenshot` cropped to target regions.
- **EXACT TECHNOLOGY:** TBD — requires explicit architecture/system-design decision (Candidates: WebAssembly Tesseract.js or pure local WASM OCR engine).
- **PROCESSING:** Performs high-accuracy optical character recognition on text-heavy visual regions where DOM text is absent (e.g., canvas elements, image buttons).
- **OUTPUT:** `OcrEvidence` interface record.
- **FAILURE / RECOVERY:** If OCR extraction fails on a crop, returns empty text with confidence 0.0.

---

### M06: Perception Fusion
- **RUNTIME LOCATION:** Chrome Extension Service Worker Context.
- **INPUT:** `VisualEvidence` (M03), `DomEvidence` (M04), and `OcrEvidence` (M05).
- **EXACT TECHNOLOGY:** Pure TypeScript Fusion Algorithm.
- **PROCESSING:** 
  1. Calculates spatial Intersection-over-Union (IoU) across visual, DOM, and OCR bounding boxes.
  2. Generates canonical, deterministic `target_id`s as `SHA-256(DOM_XPath + BackendNodeId)`.
  3. Resolves spatial discrepancies, favoring high-confidence DOM coordinates for physical alignment.
- **OUTPUT:** Canonical `PerceptionResult` record.
- **FAILURE / RECOVERY:** If multi-modal sources conflict beyond threshold, flags node with low confidence score to trigger fail-closed handling in M07.

---

### M07: Local Privacy Engine
- **RUNTIME LOCATION:** Chrome Extension Service Worker Context.
- **INPUT:** Canonical `PerceptionResult` from M06.
- **EXACT TECHNOLOGY:** Deterministic regex engines + DOM role/type heuristic rules.
- **PROCESSING:** Evaluates all node texts and roles against privacy policies:
  - Regex detection for PII (Social Security Numbers, Credit Cards, email addresses, phone numbers).
  - DOM role identification for credential inputs (`input[type="password"]`, auth tokens, session markers).
  - **Fail-Closed Rule:** Any node with ambiguous classification or low perception confidence is marked sensitive.
- **OUTPUT:** `PrivacyAssessment` record containing list of `sensitive_target_ids`.
- **NETWORK BOUNDARY:** Must NEVER make outbound network calls.

---

### M08: Sanitization / Redaction
- **RUNTIME LOCATION:** Chrome Extension Offscreen Document Context (requires Canvas 2D API).
- **INPUT:** `PerceptionResult` (M06) and `PrivacyAssessment` (M07).
- **EXACT TECHNOLOGY:** HTML5 Canvas 2D API (for image masking) and TypeScript string sanitizer (for text).
- **PROCESSING:**
  1. Loads raw screenshot into an offscreen HTML5 `<canvas>`.
  2. Renders solid, opaque `#000000` rectangles over the bounding boxes of all `sensitive_target_ids`.
  3. Re-encodes canvas to Base64 image.
  4. Scrubs string properties of sensitive nodes in the structured perception tree, replacing them with `[REDACTED]`.
- **OUTPUT:** `SanitizedObservation` record.
- **FAILURE / RECOVERY:** If canvas rendering or redaction throws an error, the pipeline immediately aborts. Raw observations are NEVER permitted to cross the network boundary.

---

### M09: Remote Reasoner Gateway
- **RUNTIME LOCATION:** 
  - **Client Component:** Chrome Extension Service Worker Context (network client).
  - **Reasoner Backend:** Remote Cloud Environment.
- **INPUT:** `SanitizedObservation` (M08) and User Task Goal.
- **EXACT TECHNOLOGY:** 
  - Client: Native Service Worker `fetch()` API with TLS encryption.
  - Remote Model: TBD — requires explicit architecture/system-design decision (External Cloud LLM endpoint).
- **PROCESSING:** Formats sanitized context into structured prompt, transmits payload over HTTPS, receives response, and validates it against the `ActionProposal` JSON schema.
- **OUTPUT:** Declarative `ActionProposal` record.
- **AUTHORITY LIMIT:** Strictly advisory. Has zero direct browser access and zero execution authority.
- **FAILURE / RECOVERY:** Retries on HTTP 502/503/504 with exponential backoff (max 3 retries). Times out after 15 seconds. On failure, notifies M01 to enter recovery.

---

### M10: Local Action Guard
- **RUNTIME LOCATION:** Chrome Extension Service Worker Context.
- **INPUT:** `ActionProposal` from M09.
- **EXACT TECHNOLOGY:** Chrome DevTools Protocol (`DOM.getBoxModel`).
- **PROCESSING:**
  1. **Freshness Verification:** Compares `proposal.observation_id` timestamp against current time. Rejects if older than 2000ms.
  2. **Spatial Verification:** Queries live browser via CDP `DOM.getBoxModel` for `proposal.target_id`. Confirms element exists, is visible in viewport, and has not shifted > 5px from observed coordinates.
  3. **Credential Injection:** If `proposal.parameters` contains a `$CREDENTIAL_*` token, resolves the secret directly from secure extension local storage (`chrome.storage.local`).
- **OUTPUT:** `ValidatedAction` record.
- **FAILURE / RECOVERY:** If element is missing, shifted, or observation is stale, marks action as `STALE` or `REJECTED`, skips execution, and requests immediate re-observation via M01.

---

### M11: Browser Executor
- **RUNTIME LOCATION:** Chrome Extension Service Worker Context.
- **INPUT:** `ValidatedAction` from M10.
- **EXACT TECHNOLOGY:** Chrome DevTools Protocol (`chrome.debugger` dispatching OS-level input events).
- **PROCESSING:** Translates validated high-level action into exact CDP hardware input sequences:
  - `CLICK`: `Input.dispatchMouseEvent` (`mousePressed` followed by `mouseReleased` at verified X/Y).
  - `TYPE`: `Input.dispatchKeyEvent` (`rawKeyDown`, `char`, `keyUp` for each character).
  - `SCROLL`: `Input.dispatchMouseEvent` with `type: 'mouseWheel'`.
- **OUTPUT:** `ExecutionResult` record returned to M01.
- **FAILURE / RECOVERY:** Traps CDP runtime errors. If event dispatch fails, returns `ExecutionResult { status: 'FAILURE' }` to M01 to initiate re-observation and error recovery.
