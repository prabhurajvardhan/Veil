# VEIL — Architecture

Status: DRAFT (PROPOSED).

## 1. What is VEIL?
VEIL is a privacy-first AI browser agent implemented as a Chrome browser extension.

## 2. What problem does it solve?
AI browser agents require context to act, but sending raw screenshots or DOM dumps to a cloud model exposes sensitive information (credentials, PII, financial data). VEIL solves this by understanding the page locally, sanitizing sensitive data on-device, and sending only a minimized, privacy-safe context to a remote reasoner.

## 3. What is the system boundary?
VEIL operates within the user's browser environment. The system boundary encapsulates the Chrome extension, the local on-device perception/privacy models, and the network interface used to communicate with the remote reasoning service. 

## 4. What runs locally?
- Chrome extension orchestration
- Observation acquisition (Screenshot, DOM, A11y, Page Metadata)
- Local visual perception (e.g., ShowUI-2B)
- Targeted OCR
- Perception fusion
- Privacy detection and sanitization
- Action validation
- Browser execution

## 5. What runs remotely?
- The reasoning and planning model that proposes actions based on sanitized context.

## 6. Why is the boundary placed there?
The boundary ensures that **raw browser data remains on the user's device**. Sensitive data must be filtered locally before the network hop because after-the-fact cloud redaction is inherently insecure and violates the principle of least privilege.

## 7. Major Components (M01-M11)

┌─────────────────────────────────────────────┐
│              LOCAL TRUST BOUNDARY           │
│                                             │
│ M01 Browser Agent Core / Orchestrator       │
│ M02 Observation Manager                     │
│ M03 Local Visual Perception                 │
│ M04 DOM / Accessibility Grounding           │
│ M05 Targeted OCR                            │
│ M06 Perception Fusion                       │
│ M07 Local Privacy Engine                    │
│ M08 Sanitization / Redaction                │
│ M10 Local Action Guard                      │
│ M11 Browser Executor                        │
└──────────────────────┬──────────────────────┘
                       │
                SANITIZED DATA
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              REMOTE BOUNDARY                │
│                                             │
│ M09 Remote Reasoner                         │
└─────────────────────────────────────────────┘

## 8. What does each component own?
- **M01 Browser Agent Core:** Owns the agent lifecycle and state machine orchestration.
- **M02 Observation Manager:** Owns extraction of browser state (pixels, DOM).
- **M03 Local Visual Perception:** Owns on-device visual grounding.
- **M04 DOM/A11y Grounding:** Owns structural grounding and element identification.
- **M05 Targeted OCR:** Owns text extraction from pixels when other methods fail.
- **M06 Perception Fusion:** Owns the merging of visual, DOM, and OCR evidence.
- **M07 Local Privacy Engine:** Owns the rules and detection of sensitive data.
- **M08 Sanitization / Redaction:** Owns the transformation of data to make it safe.
- **M09 Remote Reasoner:** Owns task planning and action proposal.
- **M10 Local Action Guard:** Owns authorization and staleness validation of actions.
- **M11 Browser Executor:** Owns the execution of approved actions in the browser.

## 9. What data flows between components?
Browser Observation → Visual/DOM/OCR Evidence → Perception Fusion → Structured PerceptionResult → Privacy Assessment → Sanitized Observation → Reasoning Request → Action Proposal → Validated Action → Execution Result.

## 10. What data is forbidden from crossing the network boundary?
Raw screenshots, raw DOM/A11y trees, raw OCR, passwords, session tokens, cookies, unredacted PII, and any data marked as "unknown" or "uncertain" by the privacy engine.

## 11. Who has reasoning authority?
**The Remote Reasoner (M09)** holds reasoning authority. It decides *how* to achieve the task.

## 12. Who has execution authority?
**The Local Action Guard (M10)** combined with the **Browser Executor (M11)** holds execution authority. The cloud is strictly a *proposer*.

## 13. How does the closed-loop agent operate?
OBSERVE → UNDERSTAND → PROTECT → REASON → VALIDATE → ACT → OBSERVE → VERIFY.
The agent must verify if an action produced the intended effect before proceeding.

## 14. How does failure propagate?
Failures (e.g., perception uncertainty, network timeout, stale action) propagate back to the orchestrator (M01). Uncertainty in privacy fails closed (blocks transmission). Stale actions are rejected and trigger re-observation. Prompt injection attempts are contained because the reasoner cannot execute directly.

## 15. How does privacy affect the architecture?
Privacy is a hard structural constraint. Low compute or low confidence must reduce the agent's capability (halting the task or requesting help), not reduce privacy (leaking data).

## 16. Which components are replaceable?
- M03 Local Visual Perception (ShowUI-2B is the current choice, but any compatible VLM/GUI model can be swapped in).
- M09 Remote Reasoner (Any compatible LLM API can serve as the planner).

## 17. Which architectural principles are stable?
- The Local Trust Boundary vs. Remote Boundary.
- Reasoning Authority vs. Execution Authority separation.
- Fail-closed privacy logic.

## 18. Which implementation choices are currently replaceable?
- The specific vision model (ShowUI-2B).
- The specific remote LLM.
- The exact OCR library.
- The transport protocol used between M08 and M09.
