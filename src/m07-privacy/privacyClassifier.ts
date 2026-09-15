import { PerceptionResult, PerceptionNode } from '../m06-fusion/types';
import { PrivacyCategory, PrivacyAssessment, PrivacyClassificationResult } from './types';

// Deterministic rules for local classification
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
// Basic phone number detection (e.g., (123) 456-7890, +1 234 567 8900)
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
// Basic credit/debit card (14 to 16 digits, possibly spaced/dashed)
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/;
// Common API key patterns (e.g. Bearer, sk-, AIza)
const API_KEY_REGEX = /\b(?:sk-[a-zA-Z0-9]{32,}|AIza[0-9A-Za-z-_]{35}|Bearer\s+[A-Za-z0-9-._~+/]+=*)\b/;
// Password indicator in role or text
const PASSWORD_INDICATOR_REGEX = /\b(password|pwd|passcode)\b/i;

export class PrivacyClassifier {
  constructor(private minConfidenceThreshold: number = 0.5) {}

  public classifyNode(node: PerceptionNode): PrivacyAssessment {
    // Fail closed on low confidence
    if (node.confidence < this.minConfidenceThreshold) {
      return {
        target_id: node.target_id,
        isSensitive: true,
        category: 'UNKNOWN',
        confidence: node.confidence,
        reason: 'Low perception confidence, failing closed',
        requiresSanitization: true,
      };
    }

    const text = node.text || '';
    const role = (node.role || '').toLowerCase();

    // 1. Password detection
    if (role === 'password' || PASSWORD_INDICATOR_REGEX.test(role)) {
      return {
        target_id: node.target_id,
        isSensitive: true,
        category: 'PASSWORD',
        confidence: 0.95,
        reason: 'Role indicates password field',
        requiresSanitization: true,
      };
    }

    // Fail closed for input fields with unknown text where we can't be sure
    // We only fail closed if it's an input/textbox and it has no text, or if the text is missing but it's an interactable that might have PII.
    if ((role === 'input' || role === 'textbox' || role === 'textarea') && !node.text) {
      return {
        target_id: node.target_id,
        isSensitive: true,
        category: 'UNKNOWN',
        confidence: 0.8,
        reason: 'Missing evidence (text) for input field, failing closed',
        requiresSanitization: true,
      };
    }

    // 2. Text-based detection (if text exists)
    if (text) {
      if (CREDIT_CARD_REGEX.test(text)) {
        // Double check it's actually 13-16 digits
        const digits = text.replace(/[^0-9]/g, '');
        if (digits.length >= 13 && digits.length <= 19) {
          return {
            target_id: node.target_id,
            isSensitive: true,
            category: 'CREDIT_CARD',
            confidence: 0.9,
            reason: 'Matches credit/debit card pattern',
            requiresSanitization: true,
          };
        }
      }

      if (API_KEY_REGEX.test(text)) {
        return {
          target_id: node.target_id,
          isSensitive: true,
          category: 'API_KEY',
          confidence: 0.9,
          reason: 'Matches API key or authentication token pattern',
          requiresSanitization: true,
        };
      }

      if (EMAIL_REGEX.test(text)) {
        return {
          target_id: node.target_id,
          isSensitive: true,
          category: 'EMAIL',
          confidence: 0.9,
          reason: 'Matches email address pattern',
          requiresSanitization: true,
        };
      }

      if (PHONE_REGEX.test(text)) {
        return {
          target_id: node.target_id,
          isSensitive: true,
          category: 'PHONE',
          confidence: 0.85,
          reason: 'Matches phone number pattern',
          requiresSanitization: true,
        };
      }
    }

    // 3. Fallback: SAFE
    return {
      target_id: node.target_id,
      isSensitive: false,
      category: 'SAFE',
      confidence: node.confidence,
      reason: 'No sensitive patterns detected',
      requiresSanitization: false,
    };
  }

  public classify(result: PerceptionResult): PrivacyClassificationResult {
    const assessments = result.nodes.map(node => this.classifyNode(node));

    return {
      observation_id: result.observation_id,
      assessments,
    };
  }
}

export function classifyPrivacy(result: PerceptionResult, minConfidenceThreshold: number = 0.5): PrivacyClassificationResult {
  const classifier = new PrivacyClassifier(minConfidenceThreshold);
  return classifier.classify(result);
}
