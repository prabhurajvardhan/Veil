# VEIL — Architecture Specification

**Status:** FROZEN  
**Purpose:** Authoritative definition of VEIL's platform, runtime boundaries, execution pipeline, and technology stack.

---

## 1. Product Identity & Platform Definition

**VEIL IS A BROWSER-EXTENSION-BASED AI AGENT.**

- **PRIMARY PRODUCT RUNTIME:** Chrome Extension
- **PRIMARY EXTENSION STANDARD:** Manifest V3 (MV3)
- **PRIMARY TARGET:** Google Chrome (Desktop)

The **Chrome Extension is the actual VEIL product runtime**. The core VEIL agent operates directly inside the browser-extension environment rather than being implemented as a standalone web application.

### Explicit Negative Boundaries (What VEIL Is NOT)
VEIL is **NOT**:
- A standalone web application.
- A standard website with an AI backend.
- A server-side browser automation system (e.g., hosted Selenium/Puppeteer farm).
- A desktop application (Electron, native executable).
- A cloud-only computer-use agent.

> **Auxiliary Interface Boundary:**  
> A web-based interface (such as a developer dashboard, configuration surface, or the repository's architecture viewer) may exist **only** as a documented auxiliary component or supporting development tool. It must **never** replace the Chrome Extension as the product runtime.

---

## 2. Core Architectural Partitioning

The system partitions responsibilities across three distinct execution boundaries:

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL TRUST BOUNDARY (Client)                           │
│                                                                                   │
│  ┌─────────────────────────────────┐      ┌────────────────────────────────────┐  │
│  │   A. Chrome Extension Runtime   │      │       B. Browser/Page Context      │  │
│  │                                 │      │                                    │  │
│  │ • Background Service Worker     │ CDP  │ • Active Tab Web Pages             │  │
│  │ • Extension Offscreen Document  ├─────►│ • DOM & Accessibility Trees        │  │
│  │ • Local State Machine (M01)     │◄─────┤ • Rendered Viewport Pixels         │  │
│  │ • Observation Manager (M02)     │      │ • Synthetic/Hardware Input Target  │  │
│  │ • Visual Perception (M03)       │      └────────────────────────────────────┘  │
│  │ • Structural Grounding (M04)    │                                              │
│  │ • Targeted OCR (M05)            │                                              │
│  │ • Perception Fusion (M06)       │                                              │
│  │ • Privacy Classification (M07)  │                                              │
│  │ • Masking & Sanitization (M08)  │                                              │
│  │ • Action Validation Guard (M10) │                                              │
│  │ • Browser Action Executor (M11) │                                              │
│  └────────────────┬────────────────┘                                              │
└───────────────────┼───────────────────────────────────────────────────────────────┘
                    │ Network Boundary (Sanitized Data Only)
                    ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                     C. Remote Supporting System (Untrusted Cloud)                 │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ • Remote Reasoner Gateway Client (M09 - client side in Service Worker)      │  │
│  │ • Cloud Reasoning & Planning Model (External Cloud Service)                 │  │
│  │                                                                             │  │
│  │ Authority: ADVISORY ONLY (Outputs declarative ActionProposal)               │  │
│  │ Prohibited: NO direct browser access, NO execution authority, NO raw data   │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Boundary Responsibilities:

#### Boundary A: Chrome Extension Runtime (Local Trust Boundary)
- **Host Context:** Extension Service Worker (`background.js`), Extension Offscreen Documents (for DOM/Canvas operations unavailable in Service Workers), and Extension Action Popup.
- **Responsibilities:**
  - Complete agent lifecycle and state machine coordination (M01).
  - Raw observation orchestration via Chrome DevTools Protocol (`chrome.debugger`) (M02).
  - Local on-device visual grounding via ShowUI-2B (M03).
  - Local DOM/A11y tree parsing and local targeted OCR (M04, M05).
  - Multi-modal perception fusion and stable target ID generation (M06).
  - Deterministic, fail-closed privacy classification (M07).
  - Irreversible visual canvas masking and DOM text redaction (M08).
  - Local Action Guard staleness verification and target validation (M10).
  - Trusted hardware event dispatching into the active tab via CDP (M11).
  - Secure local credential resolution (swapping tokens immediately prior to execution).

#### Boundary B: Browser / Page Context
- **Host Context:** Active web contents and render processes within Google Chrome tabs.
- **Responsibilities:**
  - Target application under automation (arbitrary websites, SPAs, internal portals).
  - Standard DOM, Shadow DOM, Canvas, iframe structures.
  - Receives trusted hardware input events dispatched by the Chrome Extension runtime via CDP (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`).

#### Boundary C: Cloud Reasoning Environment (Remote Supporting System)
- **Host Context:** Remote cloud LLM API endpoint.
- **Responsibilities:**
  - High-level multi-step planning and decision-making over structured, sanitized observations.
  - Generates strictly declarative `ActionProposal` objects.
- **Strict Authority Limit:** The cloud reasoning system is strictly **advisory**. It possesses **zero direct browser access** and **zero execution authority**. It never receives raw screenshots, unmasked DOM text, or user credentials.

---

## 3. End-to-End Conceptual Flow

The agent strictly executes the following closed loop:

```text
USER
  ↓ (Provides Task Goal via Extension UI)
CHROME
  ↓
VEIL CHROME EXTENSION (M01 Orchestrator)
  ↓
LOCAL OBSERVATION / PERCEPTION / PRIVACY
  [ M02: Capture Raw Observation via CDP ]
  [ M03-M05: Extract Visual, DOM, OCR Evidence locally ]
  [ M06: Fuse Multi-Modal Evidence into PerceptionResult ]
  [ M07: Identify Sensitive Nodes (Fail-Closed) ]
  [ M08: Apply Canvas Black-Box Masking & Text Redaction ]
  ↓
SANITIZED CONTEXT (SanitizedObservation)
  ↓ (Encrypted Network Egress via Service Worker fetch)
CLOUD REASONING (External Planning Model)
  ↓ (Returns Declarative ActionProposal)
LOCAL VALIDATION (M10 Action Guard)
  [ Verifies freshness: observation age <= 2000ms ]
  [ Verifies element existence & coordinate delta <= 5px via CDP DOM.getBoxModel ]
  [ Injects secure local credentials if parameter token present ]
  ↓
BROWSER EXECUTION (M11 Executor)
  [ Dispatches trusted OS-level CDP Input events ]
  ↓
RE-OBSERVATION & VERIFICATION (M02 & M01)
  [ Evaluates page outcome against intended effect ]
  ↓
(Loop repeats until Goal Achieved or Aborted)
```

---

## 4. Technology Stack Specification

| Subsystem | Selected Technology | Status | Notes |
|---|---|---|---|
| **Product Format** | Chrome Extension | **FROZEN** | Primary product runtime. |
| **Extension Standard** | Manifest V3 (MV3) | **FROZEN** | Service worker background architecture. |
| **Target Browser** | Google Chrome (Desktop) | **FROZEN** | Chrome 116+ (supports `chrome.debugger` & Offscreen Documents). |
| **Core Languages** | TypeScript / JavaScript | **FROZEN** | Strict type contracts across interfaces. |
| **Build & Tooling** | Vite / esbuild / Tailwind CSS | **FROZEN** | Bundles background script and extension UI. |
| **Browser Observation** | Chrome DevTools Protocol (`chrome.debugger`) | **FROZEN** | Direct CDP calls (`Page.captureScreenshot`, `DOM.getDocument`, `Accessibility.getFullAXTree`). |
| **Browser Execution** | Chrome DevTools Protocol (`chrome.debugger`) | **FROZEN** | Hardware-level trusted events (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`). |
| **Local Visual AI** | ShowUI-2B via WebGPU / ONNX Runtime Web | **FROZEN** | Local on-device visual grounding. |
| **Local OCR** | TBD — requires explicit architecture/system-design decision | **TBD** | Candidates: Tesseract.js / WebAssembly OCR. Must run locally without cloud egress. |
| **Local Privacy Engine** | Regex PII filters + DOM role detectors | **FROZEN** | Fail-closed deterministic local classification. |
| **Visual Sanitization** | HTML5 Canvas API in Offscreen Document | **FROZEN** | Overlays solid `#000000` rectangles over flagged bounding boxes. |
| **Remote Reasoner** | Cloud LLM Service | **TBD** | Exact model provider/API is TBD. Gateway interface locked to `SanitizedObservation` -> `ActionProposal`. |

---

## 5. Documentation Authority Hierarchy

To prevent ambiguity or engineering drift, all agents must adhere to the strict hierarchy of authority:

```text
1. Requirements (docs/requirements/REQUIREMENTS.md)
       ↓
2. Architecture (docs/architecture/ARCHITECTURE.md) [THIS DOCUMENT]
       ↓
3. System Design (docs/system-design/SYSTEM-DESIGN.md)
       ↓
4. Architectural Decisions (DECISIONS.md)
       ↓
5. Module Registry (MODULES.md)
       ↓
6. Interface Contracts (INTERFACES.md)
       ↓
7. Task Specifications (TASKS.md, docs/tasks/T*.md)
       ↓
8. Employee Operating Manuals (docs/employees/AI*.md)
       ↓
9. Implementation Code (/src/*)
```

Lower-level documents must strictly conform to higher-level documents. If a conflict arises, the higher-level document is authoritative and the lower-level document must be corrected.
