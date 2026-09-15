export type PrivacyCategory =
  | 'PASSWORD'
  | 'EMAIL'
  | 'PHONE'
  | 'CREDIT_CARD'
  | 'API_KEY'
  | 'SAFE'
  | 'UNKNOWN';

export interface PrivacyAssessment {
  target_id: string;
  isSensitive: boolean;
  category: PrivacyCategory;
  confidence: number;
  reason: string;
  requiresSanitization: boolean;
}

export interface PrivacyClassificationResult {
  observation_id: string;
  assessments: PrivacyAssessment[];
}
