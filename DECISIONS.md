# VEIL — Architectural Decisions Registry

**Status:** FROZEN
**Purpose:** Single authoritative source for major technical decisions to prevent agent hallucination.

## ADR 001: Extension Architecture & Manifest Version
- **Decision:** Chrome Extension Manifest V3 (MV3) targeting Google Chrome (Desktop).
- **Product Runtime:** The Chrome Extension is the primary product runtime for VEIL. The core agent operates locally through the browser extension runtime (Service Worker, Offscreen Documents, Popup UI).
- **Prohibitions:** VEIL is strictly NOT a standalone web application, a server-side browser automation system, or a cloud-only agent. Any web interface in this repository is strictly an auxiliary development tool/viewer and must never replace the Chrome Extension product runtime.
- **Reasoning:** Required by modern Chrome web store policies and ensures local privacy enforcement and direct, trusted browser automation via `chrome.debugger`. Provides background service workers and offscreen documents for isolated local compute.
- **Constraints:** No persistent background pages (must handle Service Worker dormancy). Outbound network requests across the privacy boundary must use `fetch` from the service worker. Offscreen documents must be used for Canvas 2D image masking and WebGPU compute.

## ADR 002: Browser Observation Mechanism
- **Decision:** `chrome.debugger` API utilizing Chrome DevTools Protocol (CDP).
  - Screenshots: `Page.captureScreenshot`
  - DOM: `DOM.getDocument`
  - Accessibility: `Accessibility.getFullAXTree`
- **Reasoning:** Standard DOM traversal via content scripts is insufficient for Shadow DOM, closed roots, and exact coordinate mapping. CDP provides the absolute source of truth.
- **Constraints:** Displays a persistent "VEIL started debugging this browser" banner. This is accepted for an autonomous agent.

## ADR 003: Browser Execution Mechanism
- **Decision:** `chrome.debugger` API dispatching trusted CDP Input events.
  - Clicks: `Input.dispatchMouseEvent`
  - Keypresses: `Input.dispatchKeyEvent`
- **Reasoning:** Synthetic DOM events (`element.click()`) fail on complex SPAs and React apps due to event delegation and `isTrusted=false` checks. CDP dispatches OS-level events.
- **Constraints:** Requires exact viewport coordinates (X/Y). 

## ADR 004: Target Identification & Coordinate Mapping
- **Decision:** VEIL Target IDs are generated as an SHA-256 hash of the CDP Node ID + Element XPath.
- **Resolution:** Elements are strictly located via `DOM.getBoxModel` to retrieve exact X/Y coordinates before `Input.dispatchMouseEvent` is fired.
- **Staleness:** If `DOM.getBoxModel` fails or the element is not visible in the current viewport, the action is rejected as STALE.

## ADR 005: Visual Grounding Runtime
- **Decision:** ShowUI-2B executed locally via WebGPU/ONNX Runtime Web.
- **Reasoning:** Meets local-only privacy requirements for visual perception.
- **Fallback:** If WebGPU is unavailable, fallback to CPU execution or fail gracefully.

## ADR 006: Local Privacy Classification
- **Decision:** Regex-based heuristic masking for PII (emails, SSNs, credit cards) + DOM role-based masking (`<input type="password">`).
- **Failure Mode:** Fail closed. If a node is uncertain, mask it with `[REDACTED]`.

## ADR 007: Credential Handling
- **Decision:** M09 (Remote Reasoner) NEVER receives credentials.
- **Mechanism:** When the LLM outputs an action to "fill password", the `ActionProposal` specifies `parameter: "$CREDENTIAL_PASSWORD"`. M10 (Local Action Guard) resolves this parameter from local extension storage immediately prior to execution in M11. 
