# VEIL — Module Registry

Status: DRAFT (PROPOSED). These modules represent real implementation boundaries for the Chrome browser agent.

| ID | Name | Responsibility | Boundary & Status |
|---|---|---|---|
| **M01** | **Browser Agent Core / Orchestrator** | Coordinates agent lifecycle, state machine, and closed-loop execution. Does NOT perform reasoning or execution itself. | Local. PLANNED. |
| **M02** | **Observation Manager** | Obtains raw browser state (screenshot, DOM, A11y, metadata). | Local. PLANNED. |
| **M03** | **Local Visual Perception** | Extracts visual understanding locally (e.g., ShowUI-2B). | Local. PLANNED. |
| **M04** | **DOM / Accessibility Grounding** | Parses structural browser info (element identity, roles, coordinates). | Local. PLANNED. |
| **M05** | **Targeted OCR** | Optional local text extraction when visual/DOM evidence is insufficient. | Local. PLANNED. |
| **M06** | **Perception Fusion** | Combines Visual, DOM, and OCR evidence into a structured `PerceptionResult` with explicit confidence and uncertainty. | Local. PLANNED. |
| **M07** | **Local Privacy Engine** | Decides what browser information is sensitive based on policy and context. Fails closed on uncertainty. | Local. PLANNED. |
| **M08** | **Sanitization / Redaction** | Transforms local observation (masks, redacts, omits) into a `SanitizedObservation` safe for the network. | Local. PLANNED. |
| **M09** | **Remote Reasoner** | Receives sanitized data, performs task planning, and outputs an `ActionProposal`. **No execution authority.** | Remote (Network). PLANNED. |
| **M10** | **Local Action Guard** | Validates proposed actions (target validity, staleness, permission, risk constraints). | Local. PLANNED. |
| **M11** | **Browser Executor** | Executes only locally validated actions via browser APIs. | Local. PLANNED. |

## Implementation Rules
- Modules must have strict inputs and outputs defined in `INTERFACES.md`.
- No module may bypass M07/M08 to send data to the network.
- No module may bypass M10 to execute an action.
