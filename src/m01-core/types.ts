/**
 * M01: Extension Core & Orchestration — Type Definitions (T015)
 * Author: AI010 (Browser Execution & Integration Engineer)
 * Authority: MODULES.md (M01), INTERFACES.md, docs/system-design/SYSTEM-DESIGN.md
 */

import { AgentState } from './stateMachine';
import { RawObservation } from '../m02-observation/types';
import { SanitizedObservation } from '../m08-sanitization/types';
import { ActionProposal } from '../m09-reasoning/types';
import { ValidatedAction, ValidationOptions } from '../m10-action-validation/types';
import { ExecutionResult } from '../m11-executor/types';
import { ReasoningGateway } from '../m09-reasoning/reasoningGateway';
import { BrowserExecutor } from '../m11-executor/browserExecutor';
import { ObservationManager } from '../m02-observation/observationManager';
import { VisualPerceptionManager } from '../m03-visual/visualPerceptionManager';
import { OcrEngine } from '../m05-ocr/types';

export interface StepRecord {
  stepIndex: number;
  observationId: string;
  timestamp: number;
  goal: string;
  sanitizedNodesCount: number;
  redactedNodesCount: number;
  proposal: ActionProposal;
  validatedAction: ValidatedAction;
  executionResult: ExecutionResult;
}

export interface OrchestratorRunResult {
  goal: string;
  finalState: AgentState;
  success: boolean;
  stepsExecuted: number;
  history: StepRecord[];
  errorMessage?: string;
}

export interface OrchestratorOptions {
  tabId?: number;
  maxSteps?: number;
  stepDelayMs?: number;
  reasoningGateway?: ReasoningGateway;
  browserExecutor?: BrowserExecutor;
  observationManager?: ObservationManager;
  visualPerceptionManager?: VisualPerceptionManager;
  ocrEngine?: OcrEngine;
  observationProvider?: (tabId: number, stepIndex: number) => Promise<RawObservation> | RawObservation;
  validationOptions?: ValidationOptions;
  onStepComplete?: (stepRecord: StepRecord) => void;
  onStateChange?: (state: AgentState) => void;
}
