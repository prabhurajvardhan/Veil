# VEIL — System Design

Status: DRAFT, pending System Design Freeze (see `system-design-freeze.md`).

## Purpose
Provide detailed design for every architectural component named in `01-architecture/architecture.md`, sufficient for module classification and implementation planning.

## Components Covered
- Perception: `perception/local-visual-perception.md`, `perception/perception-fusion.md`, `perception/observation-model.md`
- Privacy: `privacy/privacy-engine.md`, `privacy/sanitization.md`, `privacy/redaction-verification.md`
- Reasoning: `reasoning/cloud-reasoning.md`, `reasoning/context-contract.md`
- Execution: `execution/action-proposal.md`, `execution/action-validation.md`, `execution/browser-execution.md`

## Design Approach
PROPOSED: Each component document follows the same structure as `complete-data-pipeline.md` transitions: input, processing, output, owner, trust level, privacy implications, failure behavior. This keeps design documents directly traceable to module contracts in `05-engineering/interface-contracts.md`.

## Status
This document is a pointer/index. It does not itself contain frozen design decisions — see the linked documents and `system-design-freeze.md`.
