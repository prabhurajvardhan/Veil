# VEIL — Engineering Operating System

VEIL is a privacy-first AI browser agent implemented primarily as a **Chrome Extension** using **Manifest V3** targeting **Google Chrome**.

The **Chrome Extension is the product runtime**. The core VEIL agent operates directly through the browser-extension runtime to observe, parse, sanitize, validate, and execute actions within the user's browser. Cloud reasoning is a remote supporting subsystem, not the primary product runtime. The Chrome Extension maintains the local privacy boundary and the local execution authority.

> **CRITICAL ARCHITECTURAL BOUNDARY:**  
> A standalone web application is **NOT** the product architecture. Web interfaces that exist in this repository (such as the architecture and privacy boundary viewer) are strictly auxiliary development tools and supporting interfaces. They must never replace the Chrome Extension as the product runtime.

---

## 1. Documentation Authority Hierarchy
When resolving technical questions or conflicts, strictly follow the authoritative hierarchy:
```text
Requirements (docs/requirements/REQUIREMENTS.md)
       ↓
Architecture (docs/architecture/ARCHITECTURE.md)
       ↓
System Design (docs/system-design/SYSTEM-DESIGN.md)
       ↓
Technical Decisions (DECISIONS.md)
       ↓
Module Registry (MODULES.md)
       ↓
Interface Contracts (INTERFACES.md)
       ↓
Task Registry & Task Specifications (TASKS.md, docs/tasks/T*.md)
       ↓
Employee Operating Manuals (docs/employees/AI*.md)
       ↓
Implementation Code (/src/*)
```
If a lower-level document conflicts with an upstream document, the upstream document is authoritative. Lower-level documents must be corrected rather than an engineer or agent inventing a workaround.

---

## 2. Progressive Knowledge Navigation
Knowledge in VEIL is progressively discovered. Do NOT read every file at once. Follow the exact navigation chains defined in your role and task documents.

---

## 3. Employee Entry Point
If you are a new AI or human employee, locate your **Employee Operating Manual** first. Your manual contains your role startup prompt, scope boundaries, and exact instructions on discovering your assigned work:

- [AI001: Core Orchestration Engineer](docs/employees/AI001.md) — Extension Shell & Agent State Machine (M01)
- [AI002: Browser Observation Engineer](docs/employees/AI002.md) — CDP Observation Manager (M02)
- [AI003: Visual Perception Engineer](docs/employees/AI003.md) — Local Visual Grounding / ShowUI-2B (M03)
- [AI004: Structural Grounding Engineer](docs/employees/AI004.md) — DOM/A11y Grounding & Targeted OCR (M04, M05)
- [AI005: Perception Fusion Engineer](docs/employees/AI005.md) — Multi-modal Fusion & Target IDs (M06)
- [AI006: Privacy Classification Engineer](docs/employees/AI006.md) — Local PII & Sensitivity Engine (M07)
- [AI007: Sanitization & Redaction Engineer](docs/employees/AI007.md) — Screenshot Masking & DOM Redaction (M08)
- [AI008: Reasoning Gateway Engineer](docs/employees/AI008.md) — Cloud LLM Network Gateway Client (M09)
- [AI009: Action Validation Engineer](docs/employees/AI009.md) — Local Action Guard & Staleness Verifier (M10)
- [AI010: Browser Execution Engineer](docs/employees/AI010.md) — CDP Trusted Input Event Executor (M11)

---

## 4. Architectural Specifications & Control
*Consult these only when explicitly required by your task document:*
- [Architecture Overview](docs/architecture/ARCHITECTURE.md)
- [System Design](docs/system-design/SYSTEM-DESIGN.md)
- [Architectural Decisions Registry](DECISIONS.md)
- [Module Registry](MODULES.md)
- [Interface Contracts](INTERFACES.md)
- [Privacy Boundary](docs/privacy/PRIVACY-BOUNDARY.md)
- [Agent Loop & State Machine](docs/agent/STATE-MACHINE.md)
- [Project Status Board](STATUS.md)
- [Integration Milestones](INTEGRATION.md)
- [Task Registry](TASKS.md)

---
*If you are an autonomous agent: Stop reading this file. Open your assigned Employee Operating Manual.*
