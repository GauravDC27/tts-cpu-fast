import React from 'react';
import { 
  Cpu, 
  Sparkles, 
  Zap, 
  HelpCircle, 
  Layers, 
  Activity, 
  Sliders, 
  BookOpen, 
  Award,
  Terminal,
  Radio,
  Share2
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'candidates' | 'decision' | 'showdown' | 'simulator' | 'training' | 'sandbox' | 'h200' | 'argon';
  setActiveTab: (tab: 'candidates' | 'decision' | 'showdown' | 'simulator' | 'training' | 'sandbox' | 'h200' | 'argon') => void;
  onOpenOmnivoiceModal: () => void;
  onOpenDeployModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenOmnivoiceModal,
  onOpenDeployModal,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 p-2.5 text-white shadow-lg shadow-emerald-500/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  CPU TTS Architect &amp; Benchmark Studio
                </h1>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  Ubuntu 24-vCPU &amp; M1 Mac
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evaluation matrix, latency simulation, and training blueprints for high-speed, expressive CPU speech synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDeployModal && (
              <button
                onClick={onOpenDeployModal}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5 text-blue-400" />
                Push &amp; Deploy (GitHub / HF)
              </button>
            )}
            <button
              onClick={onOpenOmnivoiceModal}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Can OmniVoice Run on CPU?
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-800/80 pt-2.5">
          <button
            onClick={() => setActiveTab('h200')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer border ${
              activeTab === 'h200'
                ? 'bg-emerald-600 text-white shadow-lg border-emerald-400'
                : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 border-emerald-500/30'
            }`}
          >
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-300" />
            Live H200 Training Daemon
          </button>

          <button
            onClick={() => setActiveTab('argon')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer border ${
              activeTab === 'argon'
                ? 'bg-amber-500 text-slate-950 shadow-lg border-amber-400 font-bold'
                : 'text-amber-400 hover:text-amber-300 bg-amber-950/30 border-amber-500/40'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-amber-300" />
            Argon Judge &amp; Benchmarks
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'candidates'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Candidate Matrix (8 Models)
          </button>

          <button
            onClick={() => setActiveTab('decision')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'decision'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-amber-300" />
            Executive Verdict
          </button>

          <button
            onClick={() => setActiveTab('showdown')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'showdown'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-300" />
            Kokoro vs. StyleTTS 2 Showdown
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Hardware Latency &amp; RTF Simulator
          </button>

          <button
            onClick={() => setActiveTab('training')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'training'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Training &amp; Fine-Tuning Playbook
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'sandbox'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Interactive Prosody &amp; Emotion Sandbox
          </button>
        </nav>
      </div>
    </header>
  );
};
