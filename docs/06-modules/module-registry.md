# Module Registry

Status: DRAFT. All "Owner" and "Status" fields UNKNOWN pending team allocation (`09-team/`).

| ID | Name | Purpose | Owner | Inputs | Outputs | Dependencies | Priority | Status | Validation Method |
|---|---|---|---|---|---|---|---|---|---|
| VEIL-OBS | Observation | Capture browser state | UNKNOWN | Browser | Raw observation | Browser boundary | V1-critical | PLANNED | UNKNOWN |
| VEIL-PERCEPTION | Local Visual Perception | Run ShowUI-2B locally | UNKNOWN | Raw screenshot | Visual grounding result | VEIL-OBS | V1-critical | PLANNED | UNKNOWN |
| VEIL-FUSION | Perception Fusion | Combine visual + DOM/A11y evidence | UNKNOWN | Visual grounding + DOM/A11y | Fused perception result | VEIL-PERCEPTION, VEIL-OBS | V1-critical | PLANNED | UNKNOWN |
| VEIL-PRIVACY | Privacy Engine | Detect, sanitize, verify | UNKNOWN | Fused perception result | Sanitized observation | VEIL-FUSION | V1-critical | PLANNED | UNKNOWN |
| VEIL-REASONING | Reasoning Client | Send sanitized context, receive proposal | UNKNOWN | Sanitized observation | Action proposal | VEIL-PRIVACY | V1-critical | PLANNED | UNKNOWN |
| VEIL-VALIDATION | Action Validation | Authorize execution | UNKNOWN | Action proposal + current state | Validated action | VEIL-REASONING, VEIL-OBS | V1-critical | PLANNED | UNKNOWN |
| VEIL-EXECUTION | Browser Execution | Execute + trigger re-observation | UNKNOWN | Validated action | Execution result | VEIL-VALIDATION | V1-critical | PLANNED | UNKNOWN |
| VEIL-STATE | State Machine / Agent State | Orchestrate loop state | UNKNOWN | All stages | State transitions | All modules | V1-critical | PLANNED | UNKNOWN |

Do not invent names of team members or fill in "Owner" until `09-team/ownership-map.md` is confirmed.
