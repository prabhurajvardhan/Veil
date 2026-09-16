export type PipelinePhase =
  | 'Ready'
  | 'Observing'
  | 'Perceiving'
  | 'Privacy filtering'
  | 'Reasoning'
  | 'Validating'
  | 'Executing'
  | 'Re-observing'
  | 'Completed'
  | string;

export interface TaskStatusState {
  state: string;
  phase: PipelinePhase;
  step: number;
  maxSteps: number;
  goal: string;
  tabId?: number;
  lastAction?: any;
  history?: any[];
  error?: string;
  success?: boolean;
}

export interface ActiveTabInfo {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
}

export interface GroqConfig {
  apiKey: string;
  model: string;
  endpoint: string;
  hasStoredKey?: boolean;
}
