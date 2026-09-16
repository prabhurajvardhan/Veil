import { VeilOrchestrator } from './orchestrator';
import { ReasoningGateway } from '../m09-reasoning/reasoningGateway';
import { MockReasoningProvider } from '../m09-reasoning/providers/mockReasoningProvider';
import { HttpReasoningProvider, resolveReasoningConfig } from '../m09-reasoning/providers/httpReasoningProvider';

console.log('VEIL Service Worker initialized');

export interface TaskStatusPayload {
  state: string;
  phase: string;
  step: number;
  maxSteps: number;
  goal: string;
  lastAction?: any;
  history?: any[];
  error?: string;
  success?: boolean;
  tabId?: number;
}

let currentTaskStatus: TaskStatusPayload = {
  state: 'IDLE',
  phase: 'Ready',
  step: 0,
  maxSteps: 10,
  goal: '',
  history: [],
};

export function broadcastStatus(update: Partial<TaskStatusPayload>): void {
  currentTaskStatus = { ...currentTaskStatus, ...update };
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage({
        type: 'TASK_STATUS_UPDATE',
        status: currentTaskStatus,
      }).catch(() => {
        // Normal when popup is closed
      });
    } catch {
      // Ignored
    }
  }
}

export async function resolveActiveGateway(options?: {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}): Promise<ReasoningGateway> {
  let apiKey = options?.apiKey;
  let modelName = options?.model;
  let endpoint = options?.endpoint;

  // 1. Check chrome.storage.local if available
  if (!apiKey && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const stored = (await chrome.storage.local.get(['groqApiKey', 'groqModel', 'llmEndpoint'])) as Record<string, any>;
      if (stored && stored.groqApiKey) apiKey = String(stored.groqApiKey);
      if (stored && stored.groqModel) modelName = String(stored.groqModel);
      if (stored && stored.llmEndpoint) endpoint = String(stored.llmEndpoint);
    } catch {
      // Storage access error
    }
  }

  // 2. Check environment config (process.env / import.meta.env)
  if (!apiKey) {
    const envConfig = resolveReasoningConfig();
    apiKey = envConfig.apiKey;
    if (!modelName) modelName = envConfig.modelName;
    if (!endpoint) endpoint = envConfig.endpoint;
  }

  // If an API key is available, initialize real HttpReasoningProvider configured for Groq
  if (apiKey && apiKey.trim().length > 0) {
    const httpProvider = new HttpReasoningProvider({
      endpoint: endpoint || 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: apiKey.trim(),
      modelName: modelName || 'llama-3.3-70b-versatile',
      format: 'openai',
    });
    console.log(`[VEIL] Running with live HttpReasoningProvider (Groq: ${httpProvider.modelName})`);
    return new ReasoningGateway({ provider: httpProvider });
  }

  // Fallback to MockReasoningProvider for deterministic tests or offline prototypes
  console.log('[VEIL] No Groq API key detected; defaulting to MockReasoningProvider');
  return new ReasoningGateway({ provider: new MockReasoningProvider() });
}

// Initial default gateway and orchestrator
const initialConfig = resolveReasoningConfig();
const initialProvider = initialConfig.apiKey
  ? new HttpReasoningProvider(initialConfig)
  : new MockReasoningProvider();

const defaultGateway = new ReasoningGateway({ provider: initialProvider });
const orchestrator = new VeilOrchestrator({ reasoningGateway: defaultGateway });

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('VEIL Extension Installed');
    console.log(`Initial state: ${orchestrator.getState()}`);
  });
}

// Extension runtime message router
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object') return false;

    switch (message.type) {
      case 'GET_STATUS':
        sendResponse({
          status: 'ok',
          state: orchestrator.getState(),
          taskStatus: currentTaskStatus,
        });
        return false;

      case 'GET_CONFIG': {
        (async () => {
          let hasApiKey = false;
          let model = 'llama-3.3-70b-versatile';
          let endpoint = 'https://api.groq.com/openai/v1/chat/completions';

          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
              const stored = (await chrome.storage.local.get(['groqApiKey', 'groqModel', 'llmEndpoint'])) as Record<string, any>;
              if (stored && stored.groqApiKey) hasApiKey = true;
              if (stored && stored.groqModel) model = String(stored.groqModel);
              if (stored && stored.llmEndpoint) endpoint = String(stored.llmEndpoint);
            } catch {
              // Ignore
            }
          }
          if (!hasApiKey) {
            const envConf = resolveReasoningConfig();
            if (envConf.apiKey) hasApiKey = true;
            if (envConf.modelName) model = envConf.modelName;
          }
          sendResponse({ status: 'ok', hasApiKey, model, endpoint });
        })();
        return true;
      }

      case 'SET_CONFIG': {
        (async () => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
              await chrome.storage.local.set({
                groqApiKey: message.apiKey || '',
                groqModel: message.model || 'llama-3.3-70b-versatile',
                llmEndpoint: message.endpoint || 'https://api.groq.com/openai/v1/chat/completions',
              });
            } catch (err: any) {
              sendResponse({ status: 'error', error: err.message });
              return;
            }
          }
          sendResponse({ status: 'ok' });
        })();
        return true;
      }

      case 'START_TASK': {
        const targetTabId = message.tabId || sender.tab?.id || 1;
        const maxSteps = message.maxSteps || 10;
        const goal = message.goal;

        broadcastStatus({
          state: 'OBSERVING',
          phase: 'Observing',
          step: 1,
          maxSteps,
          goal,
          tabId: targetTabId,
          error: undefined,
          success: undefined,
          history: [],
        });

        (async () => {
          try {
            // Dynamically resolve real Groq ReasoningGateway
            const liveGateway = await resolveActiveGateway({
              apiKey: message.apiKey,
              model: message.model,
              endpoint: message.endpoint,
            });

            const result = await orchestrator.run(goal, {
              tabId: targetTabId,
              maxSteps,
              reasoningGateway: liveGateway,
              onStateChange: (state) => {
                broadcastStatus({ state });
              },
              onPhaseChange: (phase, details) => {
                broadcastStatus({ phase, lastAction: details });
              },
              onStepComplete: (stepRecord) => {
                const updatedHistory = [...(currentTaskStatus.history || []), stepRecord];
                broadcastStatus({
                  step: stepRecord.stepIndex,
                  history: updatedHistory,
                });
              },
            });

            const finalPhase = result.success
              ? 'Completed'
              : `Failed: ${result.errorMessage || 'Execution aborted'}`;

            broadcastStatus({
              state: result.finalState,
              phase: finalPhase,
              success: result.success,
              error: result.errorMessage,
            });

            sendResponse({
              status: result.success ? 'completed' : 'error',
              result,
              error: result.errorMessage,
            });
          } catch (err: any) {
            const errorMsg = err?.message || String(err);
            broadcastStatus({
              state: 'ABORTED',
              phase: `Failed: ${errorMsg}`,
              error: errorMsg,
              success: false,
            });
            sendResponse({ status: 'error', error: errorMsg });
          }
        })();

        return true; // Keep message port open for async response
      }

      default:
        sendResponse({ status: 'unknown_command' });
        return false;
    }
  });
}


