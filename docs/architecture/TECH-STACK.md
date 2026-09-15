# VEIL — Technology Stack Specification

**Status:** NOT FROZEN — V0 draft. Freeze state is authoritative only in `docs/freezes/ARCHITECTURE.md`; see ADR 008 in `DECISIONS.md`.
**Authority:** Derived directly from `docs/architecture/ARCHITECTURE.md` and `DECISIONS.md`.

---

## 1. Product Identity & Platform
- **Product Format:** Chrome Extension
- **Extension Standard:** Manifest V3 (MV3)
- **Primary Target Browser:** Google Chrome (Desktop)
- **Primary Runtime:** Browser-side Chrome Extension runtime (`chrome-extension://`)

> **PROHIBITION:** VEIL is not a standalone web application, a server-side browser automation system, or a cloud-only agent. All core observation, perception, privacy classification, sanitization, validation, and execution logic runs locally within the Chrome Extension environment.

---

## 2. Component Runtime & Technology Matrix

| Subsystem | Component | Runtime Location | Frozen Technology | Status |
|---|---|---|---|---|
| **Product Runtime** | Extension Shell | Chrome Extension MV3 | Service Worker (`background.js`), Popup UI, Offscreen Document | **BINDING** |
| **Orchestration** | M01 Core Agent | Extension Service Worker | TypeScript State Machine | **BINDING** |
| **Observation** | M02 Observation Manager | Extension Service Worker | Chrome DevTools Protocol (`chrome.debugger` API) | **BINDING** |
| **Visual Perception** | M03 Local Visual AI | Extension Offscreen / WebGPU | ShowUI-2B via ONNX Runtime Web / WebGPU | **BINDING** |
| **Structural Grounding** | M04 DOM / A11y | Extension Service Worker / Offscreen | CDP DOM/A11y tree parser | **BINDING** |
| **Targeted OCR** | M05 Targeted OCR | Extension Offscreen Document | TBD — requires explicit architecture/system-design decision | **TBD** |
| **Perception Fusion** | M06 Perception Fusion | Extension Service Worker | Pure TypeScript Fusion Engine (IoU + SHA-256 target IDs) | **BINDING** |
| **Privacy Engine** | M07 Privacy Engine | Extension Service Worker | Deterministic regex rules + DOM input type checks | **BINDING** |
| **Sanitization** | M08 Masking/Redaction | Extension Offscreen Document | HTML5 Canvas 2D API (`#000000` rects) + String scrub | **BINDING** |
| **Remote Reasoner Gateway** | M09 Client Gateway | Extension Service Worker | Native `fetch()` client transmitting `SanitizedObservation` | **BINDING** |
| **Remote Reasoner Model** | External LLM | Remote Cloud Environment | Cloud Reasoning API (TBD — requires explicit selection) | **TBD** |
| **Action Guard** | M10 Local Guard | Extension Service Worker | Freshness check + CDP `DOM.getBoxModel` validation | **BINDING** |
| **Browser Execution** | M11 Browser Executor | Extension Service Worker | CDP `Input.dispatchMouseEvent` & `Input.dispatchKeyEvent` | **BINDING** |

---

## 3. Auxiliary / Development Tools
- **Architecture Viewer:** React / Vite / Tailwind CSS (used strictly as an auxiliary internal documentation/viewer tool running on port 3000 in development, not the product runtime).
