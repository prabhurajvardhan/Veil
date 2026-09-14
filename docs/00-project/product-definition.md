# VEIL — Product Definition

## One-Line Definition
CONFIRMED: "VEIL lets AI use your browser to complete tasks while keeping sensitive screen information private."

## Target User
ASSUMPTION: A user who wants an AI agent to complete multi-step browser tasks on their behalf (form filling, navigation, data lookup, workflow automation) without exposing sensitive on-screen content (passwords, PII, financial data) to the cloud model performing the reasoning. Not yet validated against a specific persona or SIH requirement document.

## User Problem
CONFIRMED: Existing AI browser agents typically require sending raw screen/page data to a cloud model, which creates unavoidable exposure of sensitive information the user did not intend to share.

## Core User Journey
CONFIRMED (from core loop):
1. User states a task in natural language.
2. VEIL observes the current browser state.
3. VEIL locally interprets the page (visual + structural).
4. VEIL detects and sanitizes sensitive content before anything leaves the device.
5. A cloud reasoning model receives only the sanitized context and proposes the next action.
6. VEIL locally validates the proposed action before allowing execution.
7. VEIL executes the action in the browser.
8. VEIL re-observes the page and verifies the result.
9. Loop continues until the task is complete or fails.

## V1 Capability
CONFIRMED (from "V1 Technical Priority" in brief): A single working end-to-end loop — task in, observation, local perception via ShowUI-2B, privacy sanitization, cloud reasoning, local validation, execution, re-observation, verification — for one task at a time.

## Future Capability Boundaries
PROPOSED / marked FUTURE per brief: adaptive inference, dynamic model selection, advanced token reduction, sophisticated perception policies, multi-model routing, advanced reconstruction-attack defense, research-grade optimization. None of these gate V1.
