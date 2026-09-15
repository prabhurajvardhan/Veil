import React from 'react';
import { Shield, Lock, Eye, Network, Code, Server, Chrome, AlertCircle } from 'lucide-react';

function App() {
  return (
    <div id="veil-architecture-viewer-root" className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="border-b border-slate-700 pb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
            <div className="flex items-center gap-3 text-cyan-400">
              <Shield className="w-8 h-8" />
              <h1 className="text-3xl font-bold tracking-tight">VEIL</h1>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-sm font-medium">
              <Chrome className="w-4 h-4 text-cyan-400" />
              <span>Product Runtime: Chrome Extension (Manifest V3)</span>
            </div>
          </div>
          <p className="text-xl text-slate-400">Browser Agent Architecture & Privacy Boundary Viewer</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded border border-slate-700">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Note: This web interface is strictly an auxiliary development viewer. The VEIL product runtime is a Chrome Extension.</span>
          </div>
        </header>

        {/* Status */}
        <section id="system-status-section" className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Platform</div>
              <div className="font-mono text-cyan-400">Chrome Extension MV3</div>
            </div>
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Architecture</div>
              <div className="font-mono text-emerald-400">FROZEN (5 Phases)</div>
            </div>
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Next Task</div>
              <div className="font-mono text-emerald-400">T001 (READY)</div>
            </div>
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Dev Server</div>
              <div className="font-mono text-emerald-400">ONLINE (PORT 3000)</div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="module-registry-section">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code className="w-6 h-6 text-cyan-400" />
            Module Registry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Local Trust Boundary */}
            <div className="col-span-full mb-2">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Local Trust Boundary (Chrome Extension Runtime)
              </h3>
            </div>

            <ModuleCard id="M01" name="Agent Core" desc="Service Worker: Orchestrator & state machine." icon={<Server />} />
            <ModuleCard id="M02" name="Observation Manager" desc="Service Worker: CDP screenshot, DOM, A11y capture." icon={<Eye />} />
            <ModuleCard id="M03" name="Visual Perception" desc="Offscreen Document: ShowUI-2B WebGPU inference." icon={<Eye />} />
            <ModuleCard id="M04" name="DOM Grounding" desc="Service Worker: CDP DOM & A11y tree parser." icon={<Code />} />
            <ModuleCard id="M05" name="Targeted OCR" desc="Offscreen Document: Local text extraction." icon={<Eye />} />
            <ModuleCard id="M06" name="Perception Fusion" desc="Service Worker: Spatial IoU fusion & target IDs." icon={<Network />} />
            <ModuleCard id="M07" name="Privacy Engine" desc="Service Worker: Fail-closed PII & credential classifier." icon={<Shield />} />
            <ModuleCard id="M08" name="Sanitization" desc="Offscreen Document: Canvas solid-black masking." icon={<Lock />} />
            
            <ModuleCard id="M10" name="Local Action Guard" desc="Service Worker: Staleness & CDP BoxModel check." icon={<Shield />} />
            <ModuleCard id="M11" name="Browser Executor" desc="Service Worker: CDP trusted input event dispatcher." icon={<Code />} />

            {/* Remote Boundary */}
            <div className="col-span-full mt-6 mb-2">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Remote Supporting System (External Cloud LLM)
              </h3>
            </div>

            <ModuleCard id="M09" name="Remote Reasoner" desc="Cloud LLM: Advisory action proposals only. Zero execution authority." icon={<Network />} isRemote />

          </div>
        </section>

      </div>
    </div>
  );
}

function ModuleCard({ id, name, desc, icon, isRemote = false }: { id: string, name: string, desc: string, icon: React.ReactNode, isRemote?: boolean }) {
  return (
    <div id={`module-card-${id.toLowerCase()}`} className={`p-5 rounded-lg border flex flex-col gap-3 transition-colors ${isRemote ? 'bg-indigo-950/30 border-indigo-500/30 hover:border-indigo-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
      <div className="flex items-center justify-between">
        <span className={`font-mono text-sm font-bold px-2 py-1 rounded ${isRemote ? 'bg-indigo-900/50 text-indigo-300' : 'bg-slate-700 text-slate-300'}`}>{id}</span>
        <div className={`p-1.5 rounded-full ${isRemote ? 'bg-indigo-900/50 text-indigo-400' : 'bg-slate-700 text-cyan-400'}`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-slate-100">{name}</h4>
        <p className="text-sm text-slate-400 mt-1">{desc}</p>
      </div>
    </div>
  );
}

export default App;
