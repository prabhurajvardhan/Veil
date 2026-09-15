import { VeilOrchestrator } from './orchestrator';

console.log('VEIL Service Worker initialized');

const orchestrator = new VeilOrchestrator();

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

