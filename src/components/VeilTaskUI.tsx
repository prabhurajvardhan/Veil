import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Key,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Lock,
  Globe,
  Check,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { PipelinePhase, TaskStatusState, ActiveTabInfo, GroqConfig } from '../types';
import { VeilOrchestrator } from '../m01-core/orchestrator';
import { ReasoningGateway } from '../m09-reasoning/reasoningGateway';
import { HttpReasoningProvider, resolveReasoningConfig } from '../m09-reasoning/providers/httpReasoningProvider';
import { MockReasoningProvider } from '../m09-reasoning/providers/mockReasoningProvider';
import { RawObservation } from '../m02-observation/types';

const PIPELINE_STEPS: PipelinePhase[] = [
  'Observing',
  'Perceiving',
  'Privacy filtering',
  'Reasoning',
  'Validating',
  'Executing',
  'Re-observing',
];

export const VeilTaskUI: React.FC = () => {
  const [goal, setGoal] = useState<string>('Click the Submit button');
  const [activeTab, setActiveTab] = useState<ActiveTabInfo | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [status, setStatus] = useState<TaskStatusState>({
    state: 'IDLE',
    phase: 'Ready',
    step: 0,
    maxSteps: 10,
    goal: '',
    history: [],
  });

  const [groqConfig, setGroqConfig] = useState<GroqConfig>({
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    hasStoredKey: false,
  });

  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isExtensionEnv, setIsExtensionEnv] = useState<boolean>(false);

  // Standalone preview fallback orchestrator
  const previewOrchestratorRef = useRef<VeilOrchestrator | null>(null);

  // Check runtime environment & initialize tab/config
  useEffect(() => {
    const hasChrome = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.sendMessage;
    setIsExtensionEnv(hasChrome);

    if (hasChrome) {
      // 1. Query active tab
      if (chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) {
            setActiveTab({
              id: tabs[0].id,
              title: tabs[0].title || 'Active Chrome Tab',
              url: tabs[0].url || 'about:blank',
              favIconUrl: tabs[0].favIconUrl,
            });
          }
        });
      }

      // 2. Fetch current agent status
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (resp) => {
        if (resp && resp.taskStatus) {
          setStatus(resp.taskStatus);
          if (resp.taskStatus.state !== 'IDLE' && resp.taskStatus.state !== 'COMPLETED' && resp.taskStatus.state !== 'ABORTED') {
            setIsRunning(true);
          }
        }
      });

      // 3. Fetch reasoning configuration
      chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (resp) => {
        if (resp && resp.status === 'ok') {
          setGroqConfig((prev) => ({
            ...prev,
            hasStoredKey: resp.hasApiKey,
            model: resp.model || prev.model,
            endpoint: resp.endpoint || prev.endpoint,
          }));
        }
      });

      // 4. Listen for runtime status broadcasts
      const messageListener = (msg: any) => {
        if (msg && msg.type === 'TASK_STATUS_UPDATE' && msg.status) {
          setStatus(msg.status);
          if (msg.status.state === 'COMPLETED' || msg.status.state === 'ABORTED' || msg.status.phase?.startsWith('Completed') || msg.status.phase?.startsWith('Failed')) {
            setIsRunning(false);
          } else if (msg.status.state !== 'IDLE') {
            setIsRunning(true);
          }
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    } else {
      // Standalone browser preview mode
      const envConf = resolveReasoningConfig();
      if (envConf.apiKey) {
        setGroqConfig((prev) => ({
          ...prev,
          apiKey: envConf.apiKey || '',
          hasStoredKey: true,
          model: envConf.modelName || prev.model,
        }));
      }
      setActiveTab({
        id: 1,
        title: 'VEIL Test Target Form',
        url: window.location.origin + '/test-target.html',
      });
    }
  }, []);

  const handleSaveConfig = () => {
    if (isExtensionEnv && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: 'SET_CONFIG',
          apiKey: groqConfig.apiKey.trim(),
          model: groqConfig.model.trim(),
          endpoint: groqConfig.endpoint.trim(),
        },
        (res) => {
          if (res && res.status === 'ok') {
            setGroqConfig((prev) => ({ ...prev, hasStoredKey: !!groqConfig.apiKey.trim() }));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
          }
        }
      );
    } else {
      setGroqConfig((prev) => ({ ...prev, hasStoredKey: !!groqConfig.apiKey.trim() }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleRunTask = async () => {
    if (!goal.trim() || isRunning) return;

    setIsRunning(true);
    setStatus({
      state: 'OBSERVING',
      phase: 'Observing',
      step: 1,
      maxSteps: 10,
      goal: goal.trim(),
      history: [],
      error: undefined,
      success: undefined,
    });

    if (isExtensionEnv && chrome.tabs && chrome.tabs.query && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const targetTab = tabs && tabs[0] ? tabs[0] : null;
        const targetTabId = targetTab?.id || activeTab?.id || 1;

        chrome.runtime.sendMessage(
          {
            type: 'START_TASK',
            goal: goal.trim(),
            tabId: targetTabId,
            maxSteps: 10,
            apiKey: groqConfig.apiKey.trim() || undefined,
            model: groqConfig.model.trim() || undefined,
          },
          (response) => {
            setIsRunning(false);
            if (!response || response.status === 'error') {
              const errMsg = response?.error || 'No response received from background worker';
              setStatus((prev) => ({
                ...prev,
                state: 'ABORTED',
                phase: `Failed: ${errMsg}`,
                error: errMsg,
                success: false,
              }));
            } else if (response.result) {
              setStatus((prev) => ({
                ...prev,
                state: response.result.finalState,
                phase: response.result.success ? 'Completed' : `Failed: ${response.result.errorMessage || 'Aborted'}`,
                success: response.result.success,
                history: response.result.history || prev.history,
              }));
            }
          }
        );
      });
    } else {
      // Standalone Preview Mode (runs full in-memory M01-M11 pipeline for interactive verification)
      try {
        let liveReasoner: ReasoningGateway;
        const effectiveKey = groqConfig.apiKey.trim() || resolveReasoningConfig().apiKey;
        if (effectiveKey) {
          liveReasoner = new ReasoningGateway({
            provider: new HttpReasoningProvider({
              endpoint: groqConfig.endpoint,
              apiKey: effectiveKey,
              modelName: groqConfig.model,
              format: 'openai',
            }),
          });
        } else {
          liveReasoner = new ReasoningGateway({ provider: new MockReasoningProvider() });
        }

        if (!previewOrchestratorRef.current) {
          previewOrchestratorRef.current = new VeilOrchestrator({
            reasoningGateway: liveReasoner,
          });
        }

        // Mock Observation Provider targeting standard test target DOM
        const mockObservationProvider = (_tabId: number, stepIndex: number): RawObservation => {
          return {
            observation_id: `obs-preview-${Date.now()}-${stepIndex}`,
            timestamp: Date.now(),
            screenshot: {
              format: 'png',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              viewport: { width: 1280, height: 800, dpr: 1 },
            },
            dom_tree: {
              nodeId: 1,
              nodeType: 1,
              nodeName: 'HTML',
              children: [
                {
                  nodeId: 2,
                  nodeType: 1,
                  nodeName: 'BODY',
                  children: [
                    {
                      nodeId: 3,
                      backendNodeId: 101,
                      nodeType: 1,
                      nodeName: 'INPUT',
                      attributes: ['type', 'text', 'placeholder', 'Name', 'id', 'name-field', 'role', 'textbox'],
                    },
                    {
                      nodeId: 4,
                      backendNodeId: 102,
                      nodeType: 1,
                      nodeName: 'BUTTON',
                      attributes: ['type', 'submit', 'id', 'submit-button', 'role', 'button'],
                      children: [{ nodeId: 5, nodeType: 3, nodeName: '#text', nodeValue: 'Submit' }],
                    },
                  ],
                },
              ],
            },
            a11y_tree: [
              {
                nodeId: 'ax-1',
                ignored: false,
                role: { type: 'role', value: 'WebArea' },
                name: { type: 'computedString', value: 'VEIL Test Target Form' },
                childIds: ['ax-2', 'ax-3'],
              },
              {
                nodeId: 'ax-2',
                ignored: false,
                backendDOMNodeId: 101,
                role: { type: 'role', value: 'textbox' },
                name: { type: 'computedString', value: 'Name' },
              },
              {
                nodeId: 'ax-3',
                ignored: false,
                backendDOMNodeId: 102,
                role: { type: 'role', value: 'button' },
                name: { type: 'computedString', value: 'Submit' },
              },
            ],
          };
        };

        const result = await previewOrchestratorRef.current.run(goal.trim(), {
          tabId: 1,
          maxSteps: 10,
          reasoningGateway: liveReasoner,
          observationProvider: mockObservationProvider,
          onStateChange: (st) => {
            setStatus((prev) => ({ ...prev, state: st }));
          },
          onPhaseChange: (ph, details) => {
            setStatus((prev) => ({ ...prev, phase: ph, lastAction: details }));
          },
          onStepComplete: (stepRecord) => {
            setStatus((prev) => ({
              ...prev,
              step: stepRecord.stepIndex,
              history: [...(prev.history || []), stepRecord],
            }));
          },
        });

        setIsRunning(false);
        setStatus((prev) => ({
          ...prev,
          state: result.finalState,
          phase: result.success ? 'Completed' : `Failed: ${result.errorMessage || 'Error'}`,
          success: result.success,
          history: result.history || prev.history,
        }));
      } catch (err: any) {
        setIsRunning(false);
        setStatus((prev) => ({
          ...prev,
          state: 'ABORTED',
          phase: `Failed: ${err.message || String(err)}`,
          error: err.message,
          success: false,
        }));
      }
    }
  };

  const handleReset = () => {
    setStatus({
      state: 'IDLE',
      phase: 'Ready',
      step: 0,
      maxSteps: 10,
      goal: '',
      history: [],
    });
    setIsRunning(false);
  };

  const openTestTarget = () => {
    const url = window.location.origin + '/test-target.html';
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  // Determine stage visual state
  const isFailed = status.phase.startsWith('Failed');
  const isCompleted = status.phase === 'Completed' || status.state === 'COMPLETED';

  return (
    <div id="veil-task-ui-container" className="w-full max-w-lg mx-auto bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-800 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              VEIL
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                MV3 Agent
              </span>
            </h1>
            <p className="text-xs text-slate-400">Privacy-first Browser Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="open-target-btn"
            onClick={openTestTarget}
            title="Open Demo Test Page (/test-target.html)"
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test Page</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
          <button
            id="toggle-config-btn"
            onClick={() => setShowConfig(!showConfig)}
            title="Reasoning / Groq Settings"
            className={`p-1.5 rounded-md border transition-colors ${
              showConfig || groqConfig.hasStoredKey
                ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Tab Context Banner */}
      <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 truncate text-slate-300">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
          <span className="font-semibold text-slate-400 shrink-0">Target Tab:</span>
          <span className="truncate font-mono text-cyan-300" title={activeTab?.url || ''}>
            {activeTab ? `${activeTab.title || 'Tab'} (#${activeTab.id})` : 'Active Chrome Tab'}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">CDP v1.3</span>
      </div>

      {/* Optional Groq Config Panel */}
      {showConfig && (
        <div id="groq-config-panel" className="p-4 bg-slate-800/90 border-b border-slate-700 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Groq Cloud Reasoner (M09)
            </span>
            <span className="text-[11px] text-slate-400">OpenAI-Compatible Chat</span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Groq API Key</label>
            <input
              id="groq-api-key-input"
              type="password"
              value={groqConfig.apiKey}
              onChange={(e) => setGroqConfig({ ...groqConfig, apiKey: e.target.value })}
              placeholder={groqConfig.hasStoredKey ? '●●●●●●●●●●●● (Stored in extension)' : 'gsk_...'}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Key is stored locally in extension storage. Raw browser data is never sent.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Model</label>
              <input
                id="groq-model-input"
                type="text"
                value={groqConfig.model}
                onChange={(e) => setGroqConfig({ ...groqConfig, model: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 font-mono text-[11px]"
              />
            </div>
            <div className="flex items-end">
              <button
                id="save-config-btn"
                onClick={handleSaveConfig}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1 text-xs"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Key</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Task Runner Body */}
      <div className="p-5 space-y-5">
        {/* Task Prompt Input */}
        <div>
          <label htmlFor="veil-user-goal-input" className="block text-sm font-semibold text-slate-200 mb-2">
            What would you like me to do?
          </label>
          <div className="relative">
            <input
              id="veil-user-goal-input"
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleRunTask()}
              placeholder="e.g. Click the Submit button"
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-60"
            />
          </div>

          {/* Quick Demo Target Chips */}
          <div className="mt-2.5 flex items-center flex-wrap gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px]">Quick tasks:</span>
            <button
              id="preset-submit-btn"
              type="button"
              onClick={() => setGoal('Click the Submit button')}
              disabled={isRunning}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/80 transition-colors"
            >
              Click Submit button
            </button>
            <button
              id="preset-type-submit-btn"
              type="button"
              onClick={() => setGoal('Type John into the name field and click Submit')}
              disabled={isRunning}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/80 transition-colors"
            >
              Type John &amp; Submit
            </button>
          </div>
        </div>

        {/* Action Button Controls */}
        <div className="flex items-center gap-3">
          <button
            id="run-task-btn"
            type="button"
            onClick={handleRunTask}
            disabled={isRunning || !goal.trim()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold text-sm transition-all shadow-md ${
              isRunning
                ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Task</span>
              </>
            )}
          </button>

          {(status.phase !== 'Ready' || isCompleted || isFailed) && !isRunning && (
            <button
              id="reset-task-btn"
              type="button"
              onClick={handleReset}
              title="Reset task interface"
              className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Status Display */}
        <div id="veil-status-card" className="p-4 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-800">
                <XCircle className="w-3.5 h-3.5" />
                Failed
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-block w-3 h-3 rounded-full shrink-0 ${
                isCompleted
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : isFailed
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                  : isRunning
                  ? 'bg-cyan-400 animate-ping shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                  : 'bg-slate-500'
              }`}
            ></span>
            <div className="flex-1">
              <span className="text-base font-semibold text-white tracking-wide font-mono">
                {status.phase}
              </span>
              {status.step > 0 && !isCompleted && !isFailed && (
                <span className="text-xs text-slate-400 ml-2">
                  (Step {status.step} / {status.maxSteps})
                </span>
              )}
            </div>
          </div>

          {/* Detailed Error message if failed */}
          {status.error && (
            <div className="mt-3 p-2.5 rounded bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{status.error}</span>
            </div>
          )}
        </div>

        {/* Pipeline Stage Progression Stepper */}
        <div id="veil-pipeline-stepper" className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
            <span>Pipeline Execution Sequence</span>
            <span className="text-[10px] text-cyan-400 font-mono">M01 → M11</span>
          </div>

          <div className="grid grid-cols-1 gap-1 text-xs">
            {PIPELINE_STEPS.map((stepName, idx) => {
              const isCurrent = status.phase === stepName;
              const hasPassed =
                isCompleted ||
                (PIPELINE_STEPS.indexOf(status.phase as PipelinePhase) > idx && !isFailed);

              return (
                <div
                  key={stepName}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ${
                    isCurrent
                      ? 'bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 font-semibold'
                      : hasPassed
                      ? 'text-emerald-300 bg-slate-900/40'
                      : 'text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] ${
                        isCurrent
                          ? 'text-cyan-400'
                          : hasPassed
                          ? 'text-emerald-400'
                          : 'text-slate-600'
                      }`}
                    >
                      ●
                    </span>
                    <span>{stepName}</span>
                  </div>

                  <span className="text-[10px] font-mono">
                    {isCurrent ? (
                      <span className="text-cyan-400 animate-pulse">ACTIVE</span>
                    ) : hasPassed ? (
                      <Check className="w-3 h-3 text-emerald-400 inline" />
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Execution History Collapsible */}
        {status.history && status.history.length > 0 && (
          <div className="border-t border-slate-800 pt-3">
            <button
              id="toggle-history-btn"
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Execution History ({status.history.length} {status.history.length === 1 ? 'step' : 'steps'})
              </span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                {status.history.map((record, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>Step {record.stepIndex}</span>
                      <span
                        className={
                          record.executionResult?.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {record.executionResult?.status || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="text-cyan-400 truncate">
                      Action: {record.proposal?.action_type || '—'}{' '}
                      {record.proposal?.target_id ? `-> [${record.proposal.target_id}]` : ''}
                    </div>
                    <div className="text-slate-400 flex items-center justify-between text-[10px]">
                      <span>Sanitized Nodes: {record.sanitizedNodesCount ?? 0}</span>
                      <span>Redacted: {record.redactedNodesCount ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Privacy Boundary Status Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3 h-3 text-cyan-400" />
            Zero Raw Egress Boundary
          </span>
          <span className="text-slate-500">M08 Masking Active</span>
        </div>
      </div>
    </div>
  );
};
