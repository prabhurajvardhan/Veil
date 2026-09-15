/**
 * M11: Browser Executor — Core Implementation (T014)
 * Author: AI010 (Browser Execution & Integration Engineer)
 * Authority: INTERFACES.md, MODULES.md (M11), DECISIONS.md (ADR 003)
 *
 * Dispatches trusted, OS-level hardware input events via Chrome DevTools Protocol (CDP).
 *
 * CRITICAL SECURITY INVARIANTS:
 * - Accepts ONLY a ValidatedAction authorized by M10 (T013).
 * - NEVER accepts a raw ActionProposal from T012.
 * - Resolves physical target coordinates exclusively from local resolved_bbox.
 * - Never executes arbitrary JavaScript or shell commands.
 * - Fails closed on any error, returning structured ExecutionResult.
 */

import { ValidatedAction } from '../m10-action-validation/types';
import {
  BrowserExecutorOptions,
  CdpEventDispatcher,
  ExecutionResult,
} from './types';
import {
  BrowserExecutionError,
  CdpExecutionError,
  MissingTargetCoordinatesError,
  UnsupportedExecutionActionError,
  UnvalidatedActionError,
} from './errors';

export class BrowserExecutor {
  private readonly cdpDispatcher?: CdpEventDispatcher;
  private readonly defaultWaitMs: number;
  private readonly clickDelayMs: number;
  private readonly typeCharDelayMs: number;

  constructor(options?: BrowserExecutorOptions) {
    this.cdpDispatcher = options?.cdpDispatcher;
    this.defaultWaitMs = options?.defaultWaitMs ?? 1000;
    this.clickDelayMs = options?.clickDelayMs ?? 50;
    this.typeCharDelayMs = options?.typeCharDelayMs ?? 20;
  }

  /**
   * Primary execution entrypoint for M11.
   * Consumes exclusively a ValidatedAction from M10 and dispatches CDP events.
   *
   * @param action ValidatedAction record from T013 Local Action Guard
   * @returns Structured ExecutionResult conforming to INTERFACES.md
   */
  public async execute(action: unknown): Promise<ExecutionResult> {
    const timestamp = Date.now();

    // 1. Enforce that the input is strictly a ValidatedAction from M10
    if (!this.isValidatedAction(action)) {
      return {
        action_id: (action as any)?.action_id || 'UNKNOWN_ACTION',
        status: 'REJECTED',
        error_message:
          'Executor rejected input: caller passed an unvalidated ActionProposal or malformed object. All actions must pass T013 Local Action Guard.',
        execution_timestamp: timestamp,
      };
    }

    const validated = action as ValidatedAction;

    try {
      switch (validated.action_type) {
        case 'CLICK':
          await this.executeClick(validated);
          break;

        case 'TYPE':
          await this.executeType(validated);
          break;

        case 'KEY_PRESS':
          await this.executeKeyPress(validated);
          break;

        case 'SCROLL':
          await this.executeScroll(validated);
          break;

        case 'NAVIGATE':
          await this.executeNavigate(validated);
          break;

        case 'WAIT':
          await this.executeWait(validated);
          break;

        case 'DONE':
          // Task completion declaration
          break;

        case 'SELECT':
          await this.executeSelect(validated);
          break;

        default:
          throw new UnsupportedExecutionActionError(validated.action_type);
      }

      return {
        action_id: validated.action_id,
        status: 'SUCCESS',
        execution_timestamp: Date.now(),
        details: {
          action_type: validated.action_type,
          target_id: validated.target_id,
        },
      };
    } catch (err: any) {
      return {
        action_id: validated.action_id,
        status: 'FAILURE',
        error_message: err?.message || String(err),
        execution_timestamp: Date.now(),
        details: {
          error_name: err?.name,
          error_code: err?.code,
        },
      };
    }
  }

  /**
   * Strictly verifies that the object has passed M10 validation.
   * Prevents raw ActionProposal (T012) from directly accessing browser execution.
   */
  public isValidatedAction(obj: unknown): obj is ValidatedAction {
    if (!obj || typeof obj !== 'object') return false;
    const a = obj as Record<string, unknown>;

    // Must possess valid action_id and observation_id
    if (typeof a.action_id !== 'string' || !a.action_id.trim()) return false;
    if (typeof a.observation_id !== 'string' || !a.observation_id.trim()) return false;
    if (typeof a.action_type !== 'string' || !a.action_type.trim()) return false;

    // Must have validation_timestamp stamped by T013
    if (typeof a.validation_timestamp !== 'number' || a.validation_timestamp <= 0) {
      return false;
    }

    // For targeted actions, must have locally resolved_bbox (never null or raw LLM coords)
    if (a.action_type === 'CLICK' || a.action_type === 'TYPE' || a.action_type === 'SELECT') {
      if (!a.resolved_bbox || typeof a.resolved_bbox !== 'object') {
        return false;
      }
      const b = a.resolved_bbox as Record<string, unknown>;
      if (
        typeof b.x !== 'number' ||
        typeof b.y !== 'number' ||
        typeof b.width !== 'number' ||
        typeof b.height !== 'number' ||
        b.width <= 0 ||
        b.height <= 0
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Dispatches OS-level click via CDP Input.dispatchMouseEvent at center of local resolved_bbox.
   */
  private async executeClick(action: ValidatedAction): Promise<void> {
    if (!action.resolved_bbox) {
      throw new MissingTargetCoordinatesError('CLICK');
    }

    const x = Math.round(action.resolved_bbox.x + action.resolved_bbox.width / 2);
    const y = Math.round(action.resolved_bbox.y + action.resolved_bbox.height / 2);

    if (this.cdpDispatcher) {
      // 1. Mouse Moved
      await this.dispatchCdp('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y,
      });

      // 2. Mouse Pressed
      await this.dispatchCdp('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: 'left',
        clickCount: 1,
      });

      if (this.clickDelayMs > 0) {
        await this.sleep(this.clickDelayMs);
      }

      // 3. Mouse Released
      await this.dispatchCdp('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        clickCount: 1,
      });
    }
  }

  /**
   * Dispatches focus click and text insertion via CDP Input.insertText / dispatchKeyEvent.
   */
  private async executeType(action: ValidatedAction): Promise<void> {
    const text = action.parameters?.text ?? '';

    // Click target to establish focus
    if (action.resolved_bbox) {
      await this.executeClick(action);
    }

    if (this.cdpDispatcher && text) {
      // Insert text directly via CDP Input.insertText (hardware level)
      await this.dispatchCdp('Input.insertText', { text });
    }
  }

  /**
   * Dispatches keyboard event via CDP Input.dispatchKeyEvent.
   */
  private async executeKeyPress(action: ValidatedAction): Promise<void> {
    const key = action.parameters?.key;
    if (!key) {
      throw new BrowserExecutionError('KEY_PRESS requires key parameter', 'MISSING_KEY_PARAM');
    }

    if (this.cdpDispatcher) {
      await this.dispatchCdp('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key,
        windowsVirtualKeyCode: this.getVirtualKeyCode(key),
      });

      await this.dispatchCdp('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key,
        windowsVirtualKeyCode: this.getVirtualKeyCode(key),
      });
    }
  }

  /**
   * Dispatches mouse scroll wheel event via CDP Input.dispatchMouseEvent.
   */
  private async executeScroll(action: ValidatedAction): Promise<void> {
    const direction = action.parameters?.direction || 'DOWN';
    const amount = Number(action.parameters?.amount || 300);

    let deltaX = 0;
    let deltaY = 0;

    switch (direction.toUpperCase()) {
      case 'UP':
        deltaY = -amount;
        break;
      case 'DOWN':
        deltaY = amount;
        break;
      case 'LEFT':
        deltaX = -amount;
        break;
      case 'RIGHT':
        deltaX = amount;
        break;
      case 'PAGE_UP':
        deltaY = -amount * 2;
        break;
      case 'PAGE_DOWN':
        deltaY = amount * 2;
        break;
      default:
        deltaY = amount;
    }

    const x = action.resolved_bbox
      ? Math.round(action.resolved_bbox.x + action.resolved_bbox.width / 2)
      : 500;
    const y = action.resolved_bbox
      ? Math.round(action.resolved_bbox.y + action.resolved_bbox.height / 2)
      : 400;

    if (this.cdpDispatcher) {
      await this.dispatchCdp('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x,
        y,
        deltaX,
        deltaY,
      });
    }
  }

  /**
   * Dispatches page navigation via CDP Page.navigate.
   */
  private async executeNavigate(action: ValidatedAction): Promise<void> {
    const url = action.parameters?.url;
    if (!url) {
      throw new BrowserExecutionError('NAVIGATE requires url parameter', 'MISSING_URL_PARAM');
    }

    if (this.cdpDispatcher) {
      await this.dispatchCdp('Page.navigate', { url });
    }
  }

  /**
   * Executes delay wait.
   */
  private async executeWait(action: ValidatedAction): Promise<void> {
    const duration = Number(action.parameters?.duration || this.defaultWaitMs);
    const safeDuration = Math.min(Math.max(duration, 50), 30000);
    await this.sleep(safeDuration);
  }

  /**
   * Dispatches select / combobox option selection.
   */
  private async executeSelect(action: ValidatedAction): Promise<void> {
    if (action.resolved_bbox) {
      await this.executeClick(action);
    }
    const val = action.parameters?.value || action.parameters?.option;
    if (this.cdpDispatcher && val) {
      await this.dispatchCdp('Input.insertText', { text: val });
      await this.dispatchCdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter' });
      await this.dispatchCdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter' });
    }
  }

  private async dispatchCdp(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.cdpDispatcher) return undefined;
    try {
      return await this.cdpDispatcher.sendCommand(method, params);
    } catch (err) {
      throw new CdpExecutionError(method, err);
    }
  }

  private getVirtualKeyCode(key: string): number {
    switch (key) {
      case 'Enter':
        return 13;
      case 'Tab':
        return 9;
      case 'Escape':
        return 27;
      case 'ArrowUp':
        return 38;
      case 'ArrowDown':
        return 40;
      case 'ArrowLeft':
        return 37;
      case 'ArrowRight':
        return 39;
      case 'Backspace':
        return 8;
      default:
        return 0;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
