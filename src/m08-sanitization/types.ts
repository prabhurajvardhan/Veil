/**
 * M08: Sanitization & Redaction — Type Definitions
 * Author: AI007 (Sanitization & Redaction Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md, docs/tasks/T011.md
 */

import { BoundingBox, PerceptionNode, PerceptionResult } from '../m06-fusion/types';
import { PrivacyAssessment, PrivacyCategory, PrivacyClassificationResult } from '../m07-privacy/types';

/**
 * Standard redaction markers required by T011 specification.
 */
export const REDACTION_MARKERS: Record<PrivacyCategory, string> = {
  EMAIL: '[REDACTED:EMAIL]',
  PHONE: '[REDACTED:PHONE]',
  PASSWORD: '[REDACTED:PASSWORD]',
  CREDIT_CARD: '[REDACTED:CREDIT_CARD]',
  API_KEY: '[REDACTED:API_KEY]',
  UNKNOWN: '[REDACTED:UNKNOWN]',
  SAFE: '',
} as const;

export const DEFAULT_REDACTION_MARKER = '[REDACTED]';

/**
 * Sanitized perception node suitable for transmission to the reasoning layer.
 * All sensitive textual values are replaced by deterministic redaction tokens,
 * while non-sensitive structural and spatial properties are strictly preserved.
 */
export interface SanitizedPerceptionNode {
  target_id: string;
  bbox: BoundingBox;
  role: string;
  text: string | null;
  interactable: boolean;
  confidence: number;
  is_redacted: boolean;
  redaction_category?: PrivacyCategory;
}

/**
 * Sanitized observation data structure adhering to INTERFACES.md and SYSTEM-DESIGN.md.
 */
export interface SanitizedObservation {
  observation_id: string;
  timestamp: number;
  nodes: SanitizedPerceptionNode[];
  overall_confidence: number;
  screenshot?: string; // Base64 screenshot with black boxes over sensitive bounding boxes
  metadata?: {
    total_nodes: number;
    redacted_nodes_count: number;
    sanitization_applied: boolean;
  };
}

/**
 * Canvas interface abstraction for Visual Masking in browser / Offscreen Document environments.
 */
export interface Canvas2DContextLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: any, dx: number, dy: number, dw?: number, dh?: number): void;
}

export interface CanvasElementLike {
  width: number;
  height: number;
  getContext(contextId: '2d'): Canvas2DContextLike | null;
  toDataURL(type?: string, quality?: any): string;
}

/**
 * Visual masking options
 */
export interface VisualMaskingOptions {
  maskColor?: string; // Default: '#000000'
  paddingPx?: number; // Default: 0
}

/**
 * Options for the observation sanitization process.
 */
export interface SanitizationOptions {
  screenshotBase64?: string;
  timestamp?: number;
  maskScreenshot?: boolean;
  visualMaskingOptions?: VisualMaskingOptions;
  canvasFactory?: (width: number, height: number) => CanvasElementLike;
}
