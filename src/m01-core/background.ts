import { VeilOrchestrator } from './orchestrator';
import { ReasoningGateway } from '../m09-reasoning/reasoningGateway';
import { MockReasoningProvider } from '../m09-reasoning/providers/mockReasoningProvider';
import { HttpReasoningProvider, resolveReasoningConfig } from '../m09-reasoning/providers/httpReasoningProvider';

console.log('VEIL Service Worker initialized');

// Configure M09 ReasoningGateway:
// Automatically uses the real HttpReasoningProvider if an API key (Groq, HuggingFace, OpenAI)
// is available; otherwise falls back cleanly to MockReasoningProvider for deterministic tests/offline prototype execution.
const reasoningConfig = resolveReasoningConfig();
const reasoningProvider = reasoningConfig.apiKey
  ? new HttpReasoningProvider(reasoningConfig)
  : new MockReasoningProvider();

console.log(`[VEIL] Active Reasoning Provider: ${reasoningProvider.providerId}`);
if (reasoningProvider instanceof HttpReasoningProvider) {
  console.log(`[VEIL] Live Endpoint: ${reasoningProvider.endpoint} (Model: ${reasoningProvider.modelName})`);
}

const reasoningGateway = new ReasoningGateway({ provider: reasoningProvider });
const orchestrator = new VeilOrchestrator({ reasoningGateway });

chrome.runtime.onInstalled.addListener(() => {
  console.log('VEIL Extension Installed');
  console.log(`Initial state: ${orchestrator.getState()}`);
});

// Extension runtime message passing router
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object') return false;

    switch (message.type) {
      case 'GET_STATUS':
        sendResponse({
          status: 'ok',
          state: orchestrator.getState(),
        });
        return false;

      case 'START_TASK':
        orchestrator
          .run(message.goal, {
            tabId: message.tabId || sender.tab?.id || 1,
            maxSteps: message.maxSteps || 10,
          })
          .then((result) => {
            sendResponse({ status: 'completed', result });
          })
          .catch((err) => {
            sendResponse({ status: 'error', error: err.message });
          });
        return true; // Keep channel open for async response

      default:
        sendResponse({ status: 'unknown_command' });
        return false;
    }
  });
}

