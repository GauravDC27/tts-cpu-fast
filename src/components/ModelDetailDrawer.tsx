import React from 'react';
import { TTSModelCandidate } from '../utils/tts-benchmark';
import { 
  X, 
  Cpu, 
  Laptop, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Database,
  Terminal
} from 'lucide-react';

interface ModelDetailDrawerProps {
  model: TTSModelCandidate | null;
  onClose: () => void;
  onOpenTrainingGuide: (modelId: string) => void;
}

export const ModelDetailDrawer: React.FC<ModelDetailDrawerProps> = ({
  model,
  onClose,
  onOpenTrainingGuide,
}) => {
  if (!model) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">{model.name}</h3>
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/30 font-mono">
                  {model.parameterCountM}M params
                </span>
              </div>
              <p className="text-xs text-slate-400 capitalize mt-1">
                Architecture: {model.architectureType ? model.architectureType.replace(/-/g, ' ') : 'Neural Model'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-400 block mb-1">Ubuntu 24-vCPU RTF</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {model.ubuntu24vCpuRtfFp32}x
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                INT8: {model.ubuntu24vCpuRtfInt8}x
              </span>
            </div>
            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-400 block mb-1">Apple M1 Mac RTF</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {model.appleM1RtfFp32}x
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                INT8: {model.appleM1RtfInt8}x
              </span>
            </div>
            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-400 block mb-1">Word Error Rate (WER)</span>
              <span className="text-base font-bold font-mono text-blue-400">
                {model.werPercent}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                LibriSpeech / CV benchmark
              </span>
            </div>
            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-400 block mb-1">Prosody &amp; Emotion MOS</span>
              <span className="text-base font-bold font-mono text-amber-400">
                {model.emotionMOS} / 5.0
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Naturalness: {model.naturalnessMOS}/5.0
              </span>
            </div>
          </div>

          {/* Core Components */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Phonemizer Frontend:</span>
              <span className="font-mono text-slate-200">{model.phonemizer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vocoder / Decoder:</span>
              <span className="font-mono text-slate-200">{model.vocoder}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active RAM Footprint:</span>
              <span className="font-mono text-slate-200">{model.ramUsageMbFp32}MB (FP32) / {model.ramUsageMbInt8}MB (INT8)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time to First Byte (TTFB):</span>
              <span className="font-mono text-slate-200">{model.ttfbMsAvg}ms</span>
            </div>
          </div>

          {/* Strengths & Limitations */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Architectural Strengths
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {model.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Technical Constraints
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {model.limitations.map((l, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Training Hardware Requirement */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-purple-400" /> Training &amp; Fine-Tuning Setup:
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              {model.trainingHardwareReq}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-800 flex items-center gap-3">
          <button
            onClick={() => {
              onOpenTrainingGuide(model.id);
              onClose();
            }}
            className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-center text-xs font-semibold text-white transition cursor-pointer"
          >
            Open Training &amp; Export Guide
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
