# Task: [TASK-ID] — [Task Name]

## 1. Identity & Routing
- **TASK ID:** [e.g., T001]
- **TASK NAME:** [Name]
- **OWNER:** [e.g., AI001]
- **ROLE:** [e.g., Core Orchestration Engineer]
- **MODULE:** [e.g., M01]
- **SUBSYSTEM/CAPABILITY:** [e.g., State Machine]
- **CURRENT STATE:** [PLANNED | ASSIGNED | BLOCKED | READY | IN_PROGRESS | IMPLEMENTED | VALIDATED | INTEGRATION_READY | INTEGRATED | VERIFIED]
- **INTEGRATION MILESTONE:** [e.g., M0]

## 2. Dependencies
*Only change state to READY when all dependencies are MET/DONE/FROZEN.*
| Dependency ID | Type | Description | Status |
|---|---|---|---|
| [ID] | TECHNICAL | Code from prior task required | [BLOCKED/DONE] |
| [ID] | INTERFACE | Interface contract must be frozen | [FROZEN/DRAFT] |
| [ID] | DESIGN | Architecture decision required | [FROZEN] |

## 3. Scope & Boundaries
- **IMPLEMENTATION BOUNDARY:** [e.g., `/src/m01-core/`]
- **ALLOWED FILES:** [e.g., `/src/m01-core/state.ts`]
- **FORBIDDEN FILES:** Any other module's files.

## 4. Mandatory References
*You MUST read these specific sections before writing code:*
1. [Link to exact Architecture section]
2. [Link to exact System Design stage]
3. [Link to Module Contract]
4. [Link to Interface Contract]

## 5. Implementation Specifications
- **PURPOSE:** What exact software capability are you building?
- **REQUIRED INPUTS:** What data structures do you consume?
- **EXPECTED OUTPUTS:** What data structures do you produce?
- **IMPLEMENTATION BEHAVIOR:** How must the logic operate?
- **ERROR/FAILURE BEHAVIOR:** How must failures be handled or propagated?

## 6. Validation & Handoff
- **ACCEPTANCE CRITERIA:** Exact binary conditions for success.
- **VALIDATION METHOD:** How to test it locally.
- **TEST REQUIREMENTS:** Unit test coverage expectations.
- **VISIBLE RESULT:** What should the reviewer see?
- **HANDOFF REQUIREMENTS:** 
  1. Ensure tests pass. 
  2. Change CURRENT STATE to `VALIDATED`. 
  3. Update `TASKS.md`. 
  4. Ping Integration Owner.
