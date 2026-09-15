# VEIL — ShowUI Implementation

Status: DRAFT (PROPOSED).

## 1. Architectural Capability vs. Implementation
- **Architectural Capability:** LOCAL VISUAL GROUNDING (M03).
- **Current Implementation:** ShowUI-2B.

## 2. Replaceability
ShowUI-2B is the *current* visual grounding implementation choice. Do NOT make the entire VEIL architecture dependent on ShowUI-2B's specific quirks. A future compatible local GUI/VLM model must be replaceable without changing the entire VEIL architecture.

## 3. Responsibilities
- Receives a local screenshot buffer.
- Outputs bounding boxes and visual semantic labels.
- Does NOT guarantee privacy on its own (privacy comes from VEIL's M07/M08 enforcement boundary).
- Does NOT perform reasoning or execution.

## 4. Limitations
Do not assume ShowUI guarantees perfect accuracy. Its outputs are treated as one piece of evidence to be fused with DOM/A11y data in M06.
