# VEIL — Core Interfaces

**Status:** NOT FROZEN — V0 draft (interface contracts PROPOSED). No freeze ledger record exists; per ADR 008 in `DECISIONS.md` these contracts are not frozen.
**Purpose:** Defines the exact data structures passed between modules. Do not alter without an ADR.

## 1. RawObservation (M02 → M03, M04, M05)
```typescript
interface RawObservation {
  observation_id: string; // UUID v4
  timestamp: number; // Unix epoch ms
  screenshot: {
    format: 'png' | 'webp';
    data: string; // Base64
    viewport: { width: number; height: number; dpr: number }; // Device Pixel Ratio
  };
  dom_tree: CDP.DOM.Node; // Raw CDP DOM Tree
  a11y_tree: CDP.Accessibility.AXNode[]; // Raw CDP A11y Tree
}
```

## 2. VisualEvidence / DomEvidence / OcrEvidence (M03/M04/M05 → M06)
```typescript
interface BoundingBox { x: number; y: number; width: number; height: number; }

interface VisualEvidence {
  source: 'ShowUI-2B';
  elements: Array<{ bbox: BoundingBox; label: string; confidence: number }>;
}

interface DomEvidence {
  source: 'CDP';
  elements: Array<{ target_id: string; bbox: BoundingBox; role: string; text?: string; interactable: boolean }>;
}
```

## 3. PerceptionResult (M06 → M07)
```typescript
interface PerceptionNode {
  target_id: string; // Hash of DOM path
  bbox: BoundingBox;
  role: string;
  text: string | null;
  interactable: boolean;
  confidence: number; // 0.0 to 1.0
}

interface PerceptionResult {
  observation_id: string;
  nodes: PerceptionNode[];
  overall_confidence: number;
}
```

## 4. PrivacyAssessment & SanitizedObservation (M07 → M08 → M09)
```typescript
interface PrivacyAssessment {
  observation_id: string;
  sensitive_target_ids: string[]; // Nodes flagged for redaction
}

interface SanitizedObservation {
  observation_id: string;
  timestamp: number;
  screenshot: string; // Base64 with black boxes over sensitive_target_ids
  nodes: PerceptionNode[]; // Text replaced with [REDACTED] for sensitive_target_ids
}
```

## 5. ActionProposal (M09 → M10)
**Constraint:** Must never contain executable JavaScript.

```typescript
type ActionType = 'CLICK' | 'TYPE' | 'KEY_PRESS' | 'SCROLL' | 'NAVIGATE' | 'WAIT' | 'DONE';

interface ActionProposal {
  action_id: string; // UUID v4
  observation_id: string; // Must match the observation reasoned upon
  target_id?: string; // Required for CLICK, TYPE
  action_type: ActionType;
  parameters?: Record<string, string>; // e.g., { "text": "hello" } or { "key": "Enter" }
  intended_effect: string; // LLM's goal for this action
}
```

## 6. ValidatedAction (M10 → M11)
```typescript
interface ValidatedAction {
  action_id: string;
  action_type: ActionType;
  resolved_bbox?: BoundingBox; // Exact coordinates resolved locally at execution time
  parameters?: Record<string, string>; // Substituted parameters (e.g., actual password injected)
}
```

## 7. ExecutionResult & VerificationResult (M11 → M01)
```typescript
interface ExecutionResult {
  action_id: string;
  status: 'SUCCESS' | 'FAILURE' | 'STALE' | 'REJECTED';
  error_message?: string;
}

interface VerificationResult {
  action_id: string;
  intended_effect_achieved: boolean;
  confidence: number;
}
```
