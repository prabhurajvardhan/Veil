import React, { useState } from 'react';
import { Shield, Lock, Eye, Network, Code, Server } from 'lucide-react';
import { VeilTaskUI } from './components/VeilTaskUI';

function App() {
  const [showRegistry, setShowRegistry] = useState(false);

  return (
    <div id="veil-app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg space-y-6">
        {/* Primary Agent Task Runner Interface */}
        <main id="veil-main-task-interface">
          <VeilTaskUI />
        </main>

        {/* Auxiliary Architecture Registry Toggle */}
        <footer className="pt-2 text-center">
          <button
            id="toggle-registry-view-btn"
            type="button"
            onClick={() => setShowRegistry(!showRegistry)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
          >
            <span>{showRegistry ? 'Hide' : 'View'} Architecture &amp; Module Registry (M01–M11)</span>
          </button>

          {showRegistry && (
            <div id="module-registry-drawer" className="mt-6 text-left bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Shield className="w-4 h-4" />
                  <h2 className="text-sm font-semibold text-white">VEIL M01–M11 Pipeline Registry</h2>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                  All 11 Modules Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <ModuleCard id="M01" name="Agent Core" desc="Orchestrator & state machine runtime" icon={<Server className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M02" name="Observation Manager" desc="CDP screenshot, DOM, and A11y capture" icon={<Eye className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M03" name="Visual Perception" desc="ShowUI-2B visual grounding coordinates" icon={<Eye className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M04" name="DOM Grounding" desc="CDP DOM & accessibility tree parser" icon={<Code className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M05" name="Targeted OCR" desc="Local Tesseract OCR text extraction" icon={<Eye className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M06" name="Perception Fusion" desc="Spatial IoU fusion & stable target IDs" icon={<Network className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M07" name="Privacy Engine" desc="Fail-closed local PII & credential classifier" icon={<Shield className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M08" name="Sanitization" desc="Solid-black masking of sensitive bounding boxes" icon={<Lock className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M09" name="Remote Reasoner" desc="Groq Cloud LLM (advisory proposals only)" icon={<Network className="w-3.5 h-3.5 text-indigo-400" />} isRemote />
                <ModuleCard id="M10" name="Local Action Guard" desc="Staleness & BoxModel authorization guard" icon={<Shield className="w-3.5 h-3.5 text-cyan-400" />} />
                <ModuleCard id="M11" name="Browser Executor" desc="CDP trusted input event dispatcher" icon={<Code className="w-3.5 h-3.5 text-cyan-400" />} />
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

function ModuleCard({ id, name, desc, icon, isRemote = false }: { id: string; name: string; desc: string; icon: React.ReactNode; isRemote?: boolean }) {
  return (
    <div id={`module-card-${id.toLowerCase()}`} className={`p-3 rounded-lg border flex flex-col gap-1 transition-colors ${isRemote ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-slate-950/60 border-slate-800'}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-slate-300 text-[11px]">{id}</span>
        {icon}
      </div>
      <div className="font-semibold text-white text-[11px]">{name}</div>
      <div className="text-slate-400 text-[10px] leading-relaxed">{desc}</div>
    </div>
  );
}

export default App;
