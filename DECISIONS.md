# VEIL — Architectural Decisions Registry

**Status:** ACTIVE. Each ADR below carries its own status. ADRs marked **ACCEPTED (BINDING)** are authoritative engineering constraints and must be honoured by implementation tasks.
**Purpose:** Single authoritative source for major technical decisions to prevent agent hallucination.

> **Numbering note:** ADRs 001–007 are the active registry. ADRs 008–011 were added by the Lead Architect to resolve the T001 blockers (see §Freeze Authority). The ADR-001…ADR-011 identifiers used by an earlier superseded documentation draft (`ADR-011 — VEIL Documentation Restructure`) are historical and do not refer to the ADRs in this registry.

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

---

## ADR 008: Freeze Authority Is the Freeze Ledger
- **Status:** **ACCEPTED (BINDING)**
- **Decision:** The authoritative record of whether an engineering stage is frozen is the freeze ledger in `docs/freezes/`. A `FROZEN` statement in the header of a stage document is **evidence of intent to freeze**, and is binding **only** when the matching `docs/freezes/<STAGE>.md` record reads `FROZEN` with non-empty `FROZEN ARTIFACTS`.
- **Current freeze state (must match `docs/freezes/*`):**

| Stage | Stage document | Freeze ledger | Authoritative state |
|---|---|---|---|
| Requirements | `docs/requirements/REQUIREMENTS.md` | `docs/freezes/REQUIREMENTS.md` | **NOT FROZEN** |
| Architecture | `docs/architecture/ARCHITECTURE.md` | `docs/freezes/ARCHITECTURE.md` | **NOT FROZEN** |
| System Design | `docs/system-design/SYSTEM-DESIGN.md` | `docs/freezes/SYSTEM-DESIGN.md` | **NOT FROZEN** |
| Module Classification | `MODULES.md` | `docs/freezes/MODULES.md` | **NOT FROZEN** |
| Interface Contracts | `INTERFACES.md` | (no record) | **NOT FROZEN** |
| Decisions | `DECISIONS.md` | (no record) | **ACTIVE** (per-ADR status) |
| Task Decomposition | `TASKS.md` | (no record) | **NOT FROZEN** |
| Integration | `INTEGRATION.md` | (no record) | **NOT FROZEN** |

- **Reasoning:** `docs/engineering/WORKFLOW.md` §2 designates the `docs/freezes/<X>.md` file as the artifact produced by the FREEZE step, and §4 makes "Once a freeze is marked frozen" the trigger for change control. A stage document cannot certify its own freeze; only the ledger can. Repository history shows no freeze, review, validation, or sign-off event ever occurred: the freeze ledger has reported NOT FROZEN since it was created (`2e3dbc5`, `6f3b503`) and has never changed; the `FROZEN` headers on the stage documents were introduced elsewhere in the same commit that added this registry shape (`12c22ea`) and were never written to the ledger. The `FROZEN` headers are therefore aspirational drift, not completed freezes.
- **Consequence:** Per `docs/engineering/WORKFLOW.md` §3 (Freeze Order) and §7, no implementation may begin while the upstream stages are unfrozen. All 15 tasks are gated by this. Permitted pre-implementation work is the consolidation of genuinely-missing engineering specification that does not require a new architectural choice: the canonical state machine (`docs/agent/STATE-MACHINE.md`, ADR 009), the permission policy (ADR 010), the toolchain (ADR 011), and the hardened task specifications (`docs/tasks/*`). Producing these reduces blockers; it does **not** assert that any stage has passed its validation sequence.
- **Change policy:** Once a stage genuinely completes its validation sequence, the freeze is recorded in `docs/freezes/<STAGE>.md` and only then may the stage document header read `FROZEN`. A header must never be set to `FROZEN` ahead of its ledger record.

## ADR 009: Canonical M01 Agent State Machine
- **Status:** **ACCEPTED (BINDING)**
- **Decision:** VEIL has exactly **one** canonical M01 state machine, defined in `docs/agent/STATE-MACHINE.md`. It is **module-oriented** — one state per pipeline hand-off — not per-module sub-state. The eight canonical states are:

```text
IDLE → OBSERVING → AUTHORIZING → REASONING → EXECUTING → VERIFYING → COMPLETED
                                                                   ↘ ABORTED
         (any active state) → RECOVERY → OBSERVING | ABORTED
```

- **Rationale for the module-oriented model:** The competing `docs/agent/STATE-MACHINE.md` draft expanded the perception/privacy half of the pipeline (`PERCEIVING`, `FUSING`, `PRIVACY_CHECK`, `SANITIZING`, `READY_FOR_REASONING`, `ACTION_VALIDATION`, plus `TASK_RECEIVED`) into orchestrator states. That model is inconsistent with the frozen runtime architecture: M01 "does not own" perception, fusion, privacy classification, sanitization, or action validation (`MODULES.md` M01 "Does Not Own"), and those concerns are already delegated to M03–M08 and M10. Encoding them as orchestrator states duplicates other modules' internal lifecycles inside M01 and violates the module boundary. The module-oriented model maps each M01 state to exactly one inter-module hand-off, preserving `MODULES.md` boundaries.
- **Preserved from the competing draft:** `RECOVERY` terminal `FAILED` is realised as the canonical `ABORTED` state; the `VERIFYING → OBSERVING` loop and the fail-closed/uncertainty semantics are retained.
- **Ownership:** M01 only. M01 state names are an internal orchestrator concern and are never emitted to other modules, which consume the M01 outputs listed in `MODULES.md` (lifecycle triggers for M02, M09, M10).
- **Authority:** `docs/agent/STATE-MACHINE.md` is the single source of truth. `MODULES.md` M01, `docs/system-design/SYSTEM-DESIGN.md` M01, `docs/tasks/T002.md`, `T015`, and `docs/employees/AI001.md` must reference it and must not restate a competing definition.

## ADR 010: MV3 Permission & Host-Access Policy
- **Status:** **ACCEPTED (BINDING)**
- **Decision:** VEIL declares the **minimum** permission set required by its approved architecture, split by introducing task so least privilege is provable at each milestone.
- **Binding permission schedule:**

| Permission | Declared in | Architecture justification | Status |
|---|---|---|---|
| `debugger` | T001 (`manifest.json`) | ADR 002/003 require CDP observation (`Page.captureScreenshot`, `DOM.getDocument`, `Accessibility.getFullAXTree`) and execution (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`). Official reference: `chrome.debugger` — "You must declare the `debugger` permission in your extension's manifest"; its restricted domain set includes Page, DOM, Accessibility and Input, all of which VEIL uses. | REQUIRED |
| `offscreen` | T001 (`manifest.json`) | ADR 001 requires Offscreen Documents for Canvas 2D masking (M08) and WebGPU/WASM local inference (M03, M05). Official reference: `chrome.offscreen` — declare the `offscreen` permission; availability Chrome 109+ MV3+. | REQUIRED |
| `storage` | T001 (`manifest.json`) | ADR 007 requires M10 to resolve `$CREDENTIAL_*` tokens from local extension storage (`chrome.storage.local`). | REQUIRED |

- **Why all three are declared together in T001:** `manifest.json` is owned by a single writer, AI001 (see `MODULES.md` M01 Allowed Files). No other employee's allowed paths include `manifest.json`, so no downstream task can add a permission without violating a file boundary. Declaring the complete, ADR-justified V1 permission set once, in the shell, is therefore the only arrangement that is both boundary-respecting and least-privilege at the package level — and it is deliberately the *minimum* that the binding ADRs require.

- **Denied / not adopted:**
  - **`<all_urls>` and static host permissions — DENIED.** Observation and execution are performed through `chrome.debugger` (ADR 002/003), not through content-script-driven access to page DOM or network. Declaring broad host permissions would grant access VEIL does not use and violate least privilege.
  - **`activeTab` — NOT ADOPTED for V1.** It is a lesser privilege than `<all_urls>`, but it is not required to satisfy any V1 requirement: the debugger attachment targets an explicitly resolved tab id. Adopting it would create an unverified placement assumption. Re-evaluate if a milestone proves it necessary.
  - **No content scripts — DENIED.** ADR 002 explicitly rejects duplicate content-script DOM traversal ("Standard DOM traversal via content scripts is insufficient… CDP provides the absolute source of truth"). `manifest.json` declares no `content_scripts`.
- **Constraint:** Permissions are added only with an ADR (or a task update citing an existing ADR) and only when a task actually consumes the API. Never pre-grant a permission for a later module.

## ADR 011: Extension Build & Test Toolchain
- **Status:** **ACCEPTED (BINDING)**
- **Decision:** The VEIL Chrome extension is **built by Vite** and **tested by Vitest**, both of which are already in the frozen stack (`ARCHITECTURE.md` §4 "Build & Tooling: Vite / esbuild"; `TECH-STACK.md` uses Vite; `docs/engineering/QUALITY.md` §1 requires unit/integration/failure tests with no fabricated results).
- **Build:** Vite library-mode builds producing the extension payload; the Manifest V3 service worker must be emitted as `background.js` (`ARCHITECTURE.md` §2 Boundary A; `TECH-STACK.md` "Service Worker (`background.js`)").
- **Test:** Vitest is the unit/integration runner. Rationale: it shares the Vite transform pipeline already in the frozen stack and runs in-process, so module logic can be unit-tested without launching Chrome.
- **Test environment:** Unit tests run under **jsdom** (default Vitest environment) with the `chrome.*` namespace provided by lightweight hand-written test doubles. Rationale: these modules are deterministic data transforms (e.g. M06 IoU fusion, M07 regex classification) that do not need a real browser; use of mocks here is strictly limited to the platform API surface and must not replace module logic under test.
- **Scope:** This decision exists to prevent each implementation agent from selecting a different toolchain. Exact commands, configuration files, and directory layout for the extension shell are fixed in `docs/tasks/T001.md`.
- **Non-decision:** The OCR engine (M05) and the cloud reasoning endpoint (M09) remain TBD as recorded in `ARCHITECTURE.md` §4 and `REQUIREMENTS.md` §7. This ADR does not resolve them; T007 and T012 remain `BLOCKED` on those decisions. 
