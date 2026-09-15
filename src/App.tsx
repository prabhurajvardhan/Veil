import React from 'react';
import { Shield, Lock, Eye, Network, Code, Server, ChevronRight } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="border-b border-slate-700 pb-8">
          <div className="flex items-center gap-3 text-cyan-400 mb-2">
            <Shield className="w-8 h-8" />
            <h1 className="text-3xl font-bold tracking-tight">VEIL</h1>
          </div>
          <p className="text-xl text-slate-400">Browser Agent Architecture & Privacy Boundary Viewer</p>
        </header>

        {/* Status */}
        <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Implementation</div>
              <div className="font-mono text-amber-400">FROZEN (PENDING)</div>
            </div>
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Architecture</div>
              <div className="font-mono text-emerald-400">V1 REFINED</div>
            </div>
            <div className="p-4 bg-slate-900 rounded border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Dev Server</div>
              <div className="font-mono text-emerald-400">ONLINE</div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code className="w-6 h-6 text-cyan-400" />
            Module Registry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Local Trust Boundary */}
            <div className="col-span-full mb-2">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Local Trust Boundary (Execution Authority)</h3>
            </div>

            <ModuleCard id="M01" name="Agent Core" desc="Orchestrator and main state machine." icon={<Server />} />
            <ModuleCard id="M02" name="Observation Manager" desc="Collects raw browser state." icon={<Eye />} />
            <ModuleCard id="M03" name="Visual Perception" desc="ShowUI-2B Local inference." icon={<Eye />} />
            <ModuleCard id="M04" name="DOM Grounding" desc="Accessibility tree parsing." icon={<Code />} />
            <ModuleCard id="M05" name="Targeted OCR" desc="Local text extraction." icon={<Eye />} />
            <ModuleCard id="M06" name="Perception Fusion" desc="Combines multimodalities." icon={<Network />} />
            <ModuleCard id="M07" name="Privacy Engine" desc="Fail-closed local classifier." icon={<Shield />} />
            <ModuleCard id="M08" name="Sanitization" desc="Redacts sensitive data." icon={<Lock />} />
            
            <ModuleCard id="M10" name="Local Action Guard" desc="Validates proposals and hashes." icon={<Shield />} />
            <ModuleCard id="M11" name="Browser Executor" desc="Executes permitted actions." icon={<Code />} />

            {/* Remote Boundary */}
            <div className="col-span-full mt-6 mb-2">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Remote Boundary (Reasoning Authority ONLY)</h3>
            </div>

            <ModuleCard id="M09" name="Remote Reasoner" desc="Cloud LLM. Cannot execute." icon={<Network />} isRemote />

          </div>
        </section>

      </div>
    </div>
  );
}

function ModuleCard({ id, name, desc, icon, isRemote = false }: { id: string, name: string, desc: string, icon: React.ReactNode, isRemote?: boolean }) {
  return (
    <div className={`p-5 rounded-lg border flex flex-col gap-3 transition-colors ${isRemote ? 'bg-indigo-950/30 border-indigo-500/30 hover:border-indigo-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
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
