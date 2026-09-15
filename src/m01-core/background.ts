import { OrchestratorStateMachine } from './stateMachine';

console.log('VEIL Service Worker initialized');

const orchestrator = new OrchestratorStateMachine();

chrome.runtime.onInstalled.addListener(() => {
  console.log('VEIL Extension Installed');
  console.log(`Initial state: ${orchestrator.getState()}`);
});
