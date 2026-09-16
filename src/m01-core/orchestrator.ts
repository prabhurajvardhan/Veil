/**
 * M01: Extension Core & Orchestration — VEIL Main Pipeline Orchestrator (T015)
 * Author: AI010 (Browser Execution & Integration Engineer)
 * Authority: MODULES.md (M01), INTERFACES.md, docs/system-design/SYSTEM-DESIGN.md
 *
 * Implements the full VEIL autonomous loop:
 * USER GOAL
 *    ↓
 * Observation Trigger (M02)
 *    ↓
 * DOM/A11y Grounding (M04) + Visual (M03) + OCR (M05)
 *    ↓
 * Perception Fusion (M06)
 *    ↓
 * Privacy Classification (M07)
 *    ↓
 * Local Sanitization & Redaction (M08)
 *    ↓ [PRIVACY BOUNDARY - ZERO RAW DOM / SCREENSHOT / PII]
 * Remote Reasoning Gateway (M09)
 *    ↓ [UNTRUSTED ACTION PROPOSAL]
 * Local Action Validation Authority (M10)
 *    ↓ [STRICTLY AUTHORIZED VALIDATED ACTION]
 * Browser Execution via CDP (M11)
 *    ↓
 * Verification & Re-Observation Loop
 */

import { OrchestratorStateMachine, AgentState } from './stateMachine';
import { OrchestratorOptions, OrchestratorRunResult, StepRecord } from './types';
import { ObservationManager, generateObservationId } from '../m02-observation/observationManager';
import { RawObservation } from '../m02-observation/types';
import { DomGrounder } from '../m04-dom/domGrounding';
import { VisualPerceptionManager } from '../m03-visual/visualPerceptionManager';
import { VisualEvidence } from '../m03-visual/types';
import { TesseractAdapter } from '../m05-ocr/tesseractAdapter';
import { OcrEngine, OcrEvidence } from '../m05-ocr/types';
import { PerceptionFusionEngine } from '../m06-fusion/perceptionFusion';
import { PrivacyClassifier } from '../m07-privacy/privacyClassifier';
import { sanitizeObservation } from '../m08-sanitization/observationSanitizer';
import { ReasoningGateway } from '../m09-reasoning/reasoningGateway';
import { validateAction } from '../m10-action-validation/actionValidator';
import { BrowserExecutor } from '../m11-executor/browserExecutor';
import { SanitizedObservation } from '../m08-sanitization/types';

export class VeilOrchestrator {
  private readonly stateMachine: OrchestratorStateMachine;
  private readonly domGrounder: DomGrounder;
  private readonly visualPerceptionManager?: VisualPerceptionManager;
  private readonly ocrEngine?: OcrEngine;
  private readonly fusionEngine: PerceptionFusionEngine;
  private readonly privacyClassifier: PrivacyClassifier;
  private readonly observationManager: ObservationManager;
  private readonly defaultExecutor?: BrowserExecutor;
  private readonly defaultReasoner?: ReasoningGateway;

  constructor(options?: {
    visualPerceptionManager?: VisualPerceptionManager;
    ocrEngine?: OcrEngine;
    observationManager?: ObservationManager;
    browserExecutor?: BrowserExecutor;
    reasoningGateway?: ReasoningGateway;
  }) {
    this.stateMachine = new OrchestratorStateMachine();
    this.domGrounder = new DomGrounder();
    this.fusionEngine = new PerceptionFusionEngine();
    this.privacyClassifier = new PrivacyClassifier(0.5);
    this.observationManager = options?.observationManager ?? new ObservationManager();
    this.visualPerceptionManager = options?.visualPerceptionManager ?? new VisualPerceptionManager();
    this.ocrEngine = options?.ocrEngine ?? new TesseractAdapter();
    this.defaultExecutor = options?.browserExecutor;
    this.defaultReasoner = options?.reasoningGateway;
  }

  public getState(): AgentState {
    return this.stateMachine.getState();
  }

  /**
   * Runs the complete end-to-end autonomous agent loop for a user goal.
   */
  public async run(goal: string, options?: OrchestratorOptions): Promise<OrchestratorRunResult> {
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return {
        goal: goal || '',
        finalState: 'ABORTED',
        success: false,
        stepsExecuted: 0,
        history: [],
        errorMessage: 'Invalid user goal: goal must be a non-empty string',
      };
    }

    const tabId = options?.tabId ?? 1;
    const maxSteps = options?.maxSteps ?? 10;
    const history: StepRecord[] = [];

    if (this.stateMachine.getState() === 'COMPLETED' || this.stateMachine.getState() === 'ABORTED') {
      this.stateMachine.transition('IDLE');
      if (options?.onStateChange) options.onStateChange('IDLE');
    }

    const reasoner = options?.reasoningGateway ?? this.defaultReasoner;
    if (!reasoner) {
      return {
        goal,
        finalState: 'ABORTED',
        success: false,
        stepsExecuted: 0,
        history,
        errorMessage: 'VeilOrchestrator requires a configured ReasoningGateway',
      };
    }

    const manager = options?.observationManager ?? this.observationManager;
    // Connect M11 BrowserExecutor to the active Chrome/CDP session for the target tab
    const cdpSession = manager.getOrCreateSession(tabId);
    const executor = options?.browserExecutor ?? this.defaultExecutor ?? new BrowserExecutor({ cdpDispatcher: cdpSession });

    try {
      for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex++) {
        // ==========================================================
        // 1. OBSERVING: Capture and ground browser state
        // ==========================================================
        this.transition('OBSERVING', options?.onStateChange);
        options?.onPhaseChange?.(stepIndex > 1 ? 'Re-observing' : 'Observing', { stepIndex });

        const rawObs = await this.acquireRawObservation(tabId, stepIndex, options);

        options?.onPhaseChange?.('Perceiving', { stepIndex });

        // M04: DOM/A11y Grounding
        const domEvidence = this.domGrounder.ground(rawObs.dom_tree, rawObs.a11y_tree, {
          viewport: rawObs.screenshot?.viewport,
        });

        // M03: Visual Perception (ShowUI-2B)
        let visualEvidence: VisualEvidence | undefined;
        if (rawObs.screenshot && rawObs.screenshot.data) {
          try {
            const visualMgr = options?.visualPerceptionManager ?? this.visualPerceptionManager;
            if (visualMgr) {
              visualEvidence = await visualMgr.processScreenshot({
                format: rawObs.screenshot.format,
                data: rawObs.screenshot.data,
                viewport: rawObs.screenshot.viewport,
              });
            }
          } catch (err) {
            // Fail closed: if visual perception is unavailable, do NOT invent evidence
            visualEvidence = undefined;
          }
        }

        // M05: Targeted OCR (Tesseract.js)
        let ocrEvidence: OcrEvidence | undefined;
        if (rawObs.screenshot && rawObs.screenshot.data) {
          try {
            const ocrEng = options?.ocrEngine ?? this.ocrEngine;
            if (ocrEng) {
              const ocrResult = await ocrEng.process(rawObs.screenshot);
              if (ocrResult) {
                ocrEvidence = ocrResult;
              }
            }
          } catch (err) {
            // Fail closed: if OCR is unavailable, do NOT invent evidence
            ocrEvidence = undefined;
          }
        }

        // M06: Multimodal Perception Fusion (DOM + Visual + OCR)
        const fusionResult = this.fusionEngine.fuse({
          observation_id: rawObs.observation_id,
          dom: domEvidence,
          visual: visualEvidence,
          ocr: ocrEvidence,
        });

        // ==========================================================
        // 2. AUTHORIZING: Local Privacy Classification & Sanitization
        // ==========================================================
        this.transition('AUTHORIZING', options?.onStateChange);
        options?.onPhaseChange?.('Privacy filtering', { stepIndex });

        const classification = this.privacyClassifier.classify(fusionResult);
        const sanitizedObs = await sanitizeObservation(fusionResult, classification);

        // Security check: Assert that no raw browser data crosses the boundary
        this.assertPrivacyBoundaryIntegrity(sanitizedObs);

        // ==========================================================
        // 3. REASONING: Propose Action (M09 Gateway)
        // ==========================================================
        this.transition('REASONING', options?.onStateChange);
        options?.onPhaseChange?.('Reasoning', { stepIndex });

        const proposal = await reasoner.proposeAction(sanitizedObs, goal);

        // ==========================================================
        // 4. EXECUTING: Local Action Validation (M10) + Execution (M11)
        // ==========================================================
        this.transition('EXECUTING', options?.onStateChange);
        options?.onPhaseChange?.('Validating', { stepIndex, targetId: proposal.target_id, actionType: proposal.action_type });

        // Authorize action via Local Action Guard (T013)
        const validatedAction = await validateAction(proposal, sanitizedObs, options?.validationOptions);

        options?.onPhaseChange?.('Executing', { stepIndex, action: validatedAction.action_type });

        // Execute authorized action via Browser Executor (T014)
        const execResult = await executor.execute(validatedAction);

        const stepRecord: StepRecord = {
          stepIndex,
          observationId: rawObs.observation_id,
          timestamp: Date.now(),
          goal,
          sanitizedNodesCount: sanitizedObs.nodes.length,
          redactedNodesCount: sanitizedObs.metadata?.redacted_nodes_count ?? 0,
          proposal,
          validatedAction,
          executionResult: execResult,
        };

        history.push(stepRecord);
        if (options?.onStepComplete) {
          options.onStepComplete(stepRecord);
        }

        // ==========================================================
        // 5. VERIFYING: Check Execution Status & Completion
        // ==========================================================
        this.transition('VERIFYING', options?.onStateChange);

        if (execResult.status !== 'SUCCESS') {
          this.stateMachine.registerFailure();
          options?.onPhaseChange?.(`Failed: ${execResult.error_message || execResult.status}`, { stepIndex });
          return {
            goal,
            finalState: this.stateMachine.getState(),
            success: false,
            stepsExecuted: stepIndex,
            history,
            errorMessage: `Execution failed at step ${stepIndex}: ${execResult.error_message || execResult.status}`,
          };
        }

        // If action was DONE, task is successfully completed!
        if (validatedAction.action_type === 'DONE') {
          this.transition('COMPLETED', options?.onStateChange);
          options?.onPhaseChange?.('Completed', { stepsExecuted: stepIndex });
          return {
            goal,
            finalState: 'COMPLETED',
            success: true,
            stepsExecuted: stepIndex,
            history,
          };
        }

        // Action succeeded, brief settling pause before re-observing
        if (options?.stepDelayMs && options.stepDelayMs > 0) {
          await new Promise((r) => setTimeout(r, options.stepDelayMs));
        }

        // Loop continues -> will enter OBSERVING with a NEW observation_id in next iteration
        options?.onPhaseChange?.('Re-observing', { nextStepIndex: stepIndex + 1 });
      }

      // If loop finished without reaching DONE, abort or finish with max steps
      return {
        goal,
        finalState: this.stateMachine.getState(),
        success: false,
        stepsExecuted: maxSteps,
        history,
        errorMessage: `Task exceeded maximum permitted steps (${maxSteps}) without declaring DONE`,
      };
    } catch (err: any) {
      this.stateMachine.abort();
      if (options?.onStateChange) options.onStateChange('ABORTED');
      return {
        goal,
        finalState: 'ABORTED',
        success: false,
        stepsExecuted: history.length,
        history,
        errorMessage: err?.message || String(err),
      };
    }
  }

  private transition(targetState: AgentState, onStateChange?: (state: AgentState) => void): void {
    this.stateMachine.transition(targetState);
    if (onStateChange) {
      onStateChange(this.stateMachine.getState());
    }
  }

  private async acquireRawObservation(
    tabId: number,
    stepIndex: number,
    options?: OrchestratorOptions
  ): Promise<RawObservation> {
    if (options?.observationProvider) {
      const customObs = await options.observationProvider(tabId, stepIndex);
      if (!customObs.observation_id) {
        customObs.observation_id = generateObservationId();
      }
      return customObs;
    }

    const manager = options?.observationManager ?? this.observationManager;
    return manager.captureRawObservation(tabId);
  }

  /**
   * Enforces that the sanitized observation does not leak raw trees or unredacted secrets.
   */
  private assertPrivacyBoundaryIntegrity(obs: SanitizedObservation): void {
    const rawObs = obs as any;
    if (rawObs.dom_tree !== undefined) {
      throw new Error('PRIVACY BOUNDARY LEAK: raw dom_tree detected in outbound SanitizedObservation');
    }
    if (rawObs.a11y_tree !== undefined) {
      throw new Error('PRIVACY BOUNDARY LEAK: raw a11y_tree detected in outbound SanitizedObservation');
    }
    if (rawObs.raw_ocr !== undefined) {
      throw new Error('PRIVACY BOUNDARY LEAK: raw_ocr detected in outbound SanitizedObservation');
    }
    if (rawObs.screenshot !== undefined || rawObs.raw_screenshot !== undefined) {
      throw new Error('PRIVACY BOUNDARY LEAK: raw screenshot detected in outbound SanitizedObservation');
    }
  }
}
