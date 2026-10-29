import React, { useState } from 'react';
import { TTS_CANDIDATES, TTSModelCandidate } from '../utils/tts-benchmark';
import { 
  Cpu, 
  Zap, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Layers, 
  ArrowUpDown,
  BookOpen,
  Filter,
  Microchip,
  Laptop
} from 'lucide-react';

interface CandidateMatrixProps {
  onSelectModel: (model: TTSModelCandidate) => void;
  onOpenOmnivoiceAnalysis: () => void;
  onOpenTrainingGuide: (modelId: string) => void;
}

export const CandidateMatrix: React.FC<CandidateMatrixProps> = ({
  onSelectModel,
  onOpenOmnivoiceAnalysis,
  onOpenTrainingGuide,
}) => {
  const [sortField, setSortField] = useState<keyof TTSModelCandidate>('ubuntu24vCpuRtfFp32');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterFeasibility, setFilterFeasibility] = useState<string>('all');
  const [targetHardware, setTargetHardware] = useState<'ubuntu-24vcpu' | 'apple-m1'>('ubuntu-24vcpu');

  const handleSort = (field: keyof TTSModelCandidate) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredCandidates = TTS_CANDIDATES.filter((candidate) => {
    if (filterFeasibility === 'all') return true;
    if (filterFeasibility === 'champion-viable') return candidate.cpuFeasibility === 'champion' || candidate.cpuFeasibility === 'viable';
    return candidate.cpuFeasibility === filterFeasibility;
  }).sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* OmniVoice Direct Answer Callout Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900/40 p-5 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-amber-200">
                  Direct Answer: Can models like OmniVoice be run on CPU?
                </h3>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-300 border border-rose-500/30">
                  Not Viable for Real-Time
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300 leading-relaxed max-w-4xl">
                Technically <strong>yes</strong> (PyTorch CPU will run the graph), but practically <strong>no for production</strong>.
                OmniVoice and Speech LLMs use continuous autoregressive audio codebook tokenizers requiring sequential token-by-token transformer passes. 
                On a 24-vCPU or M1 CPU, their RTF is <span className="font-mono text-amber-300 font-bold">1.6 – 3.2</span> (meaning a 10s clip takes 16–32 seconds to synthesize), with memory bandwidth starvation and high WER token repetition.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenOmnivoiceAnalysis}
            className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-4 py-2.5 text-sm font-medium transition cursor-pointer"
          >
            <Microchip className="h-4 w-4" />
            See OmniVoice CPU Bottleneck Deep-Dive
          </button>
        </div>
      </div>

      {/* Target Hardware Selector & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Hardware Focus:
          </span>
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setTargetHardware('ubuntu-24vcpu')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                targetHardware === 'ubuntu-24vcpu'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" /> Ubuntu 24-vCPU (x86_64 / AVX-512)
            </button>
            <button
              onClick={() => setTargetHardware('apple-m1')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                targetHardware === 'apple-m1'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" /> Apple M1 Mac (Unified Memory / AMX)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter:</span>
          <select
            value={filterFeasibility}
            onChange={(e) => setFilterFeasibility(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Models (8 Models)</option>
            <option value="champion-viable">Only CPU Ready (RTF &lt; 0.20)</option>
            <option value="champion">Champions Only (Kokoro & Piper)</option>
            <option value="impractical">Impractical on CPU (OmniVoice, etc.)</option>
          </select>
        </div>
      </div>

      {/* Candidate Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 font-semibold">
              <th className="py-3.5 px-4">Model & Architecture</th>
              <th className="py-3.5 px-3">
                <button 
                  onClick={() => handleSort('parameterCountM')}
                  className="flex items-center gap-1 hover:text-slate-200"
                >
                  Size <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3.5 px-3">
                <button 
                  onClick={() => handleSort('werPercent')}
                  className="flex items-center gap-1 hover:text-slate-200"
                >
                  WER % (Accuracy) <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3.5 px-3">
                <button 
                  onClick={() => handleSort('emotionMOS')}
                  className="flex items-center gap-1 hover:text-slate-200"
                >
                  Emotion &amp; Prosody <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3.5 px-3">
                <button 
                  onClick={() => handleSort(targetHardware === 'apple-m1' ? 'appleM1RtfFp32' : 'ubuntu24vCpuRtfFp32')}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
                >
                  {targetHardware === 'apple-m1' ? 'M1 RTF (FP32)' : 'v24 CPU RTF (FP32)'} <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3.5 px-3">INT8 RTF</th>
              <th className="py-3.5 px-3">RAM</th>
              <th className="py-3.5 px-3">CPU Feasibility</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredCandidates.map((model) => {
              const rtfFp32 = targetHardware === 'apple-m1' ? model.appleM1RtfFp32 : model.ubuntu24vCpuRtfFp32;
              const rtfInt8 = targetHardware === 'apple-m1' ? model.appleM1RtfInt8 : model.ubuntu24vCpuRtfInt8;
              const isWinner = model.id === 'kokoro-82m';

              return (
                <tr 
                  key={model.id}
                  className={`transition hover:bg-slate-800/40 ${
                    isWinner ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500' : ''
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{model.name}</span>
                          {isWinner && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/40">
                              <Sparkles className="h-3 w-3" /> TOP CHOICE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 capitalize mt-0.5">
                          {model?.architectureType ? model.architectureType.replace(/-/g, ' ') : 'Neural Model'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-3 font-mono text-xs text-slate-300">
                    {model.parameterCountM}M
                  </td>

                  <td className="py-4 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-semibold ${
                        model.werPercent <= 2.5 ? 'text-emerald-400' : model.werPercent <= 3.5 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {model.werPercent}%
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {model.werPercent <= 2.5 ? '(ultra-low)' : model.werPercent <= 3.5 ? '(moderate)' : '(hallucinations)'}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-xs ${
                              star <= Math.round(model.emotionMOS) ? 'text-amber-400' : 'text-slate-600'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {model.emotionMOS}/5
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-3 font-mono text-xs">
                    <span className={`inline-block px-2 py-1 rounded font-bold ${
                      rtfFp32 < 0.15 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : rtfFp32 < 0.5 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : rtfFp32 < 1.0 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-black'
                    }`}>
                      {rtfFp32}x
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {rtfFp32 < 1.0 ? `${(1 / rtfFp32).toFixed(1)}x real-time` : 'slower than audio'}
                    </span>
                  </td>

                  <td className="py-4 px-3 font-mono text-xs text-slate-300">
                    {rtfInt8}x
                  </td>

                  <td className="py-4 px-3 font-mono text-xs text-slate-400">
                    {model.ramUsageMbFp32}MB
                  </td>

                  <td className="py-4 px-3">
                    {model.cpuFeasibility === 'champion' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" /> CPU Native
                      </span>
                    )}
                    {model.cpuFeasibility === 'viable' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Production
                      </span>
                    )}
                    {model.cpuFeasibility === 'borderline' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
                        <AlertTriangle className="h-3.5 w-3.5" /> High Load
                      </span>
                    )}
                    {model.cpuFeasibility === 'impractical' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30">
                        <XCircle className="h-3.5 w-3.5" /> Impractical
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectModel(model)}
                        className="rounded-md bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 transition"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => onOpenTrainingGuide(model.id)}
                        className="rounded-md bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 px-2.5 py-1 text-xs font-medium transition"
                      >
                        Training Guide
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Decision Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
            <Sparkles className="h-5 w-5" />
            <h4>Best Overall Winner: Kokoro-82M</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Derived from StyleTTS2 architecture. Offers the highest MOS emotion score (4.5/5) with astonishing CPU speeds (<strong className="text-emerald-300">0.08 RTF</strong> on 24-vCPU and <strong className="text-emerald-300">0.09 RTF</strong> on M1). Uses ISTFTNet vocoder which bypasses the heavy diffusion steps at runtime.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <span>Recommended for your primary target.</span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-blue-400 font-semibold mb-2">
            <Zap className="h-5 w-5" />
            <h4>Fastest Speed Winner: Piper (VITS)</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If you need absolute sub-50ms latency and 30x-50x faster than real-time generation on a single CPU core, Piper/VITS is king (<strong className="text-blue-300">0.035 RTF</strong>). Its prosody is slightly more formal, but its fine-tuning process is the easiest and can even train on CPU.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 font-medium">
            <span>Ideal for high-throughput microservices.</span>
          </div>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-purple-400 font-semibold mb-2">
            <Layers className="h-5 w-5" />
            <h4>Deep Prosody Winner: StyleTTS 2</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If dramatic acting and extreme voice timbre shifting are required, StyleTTS 2 provides non-autoregressive style diffusion with SLM adversarial training. Fine-tuning requires 1x 24GB GPU, but exports directly to ONNX for CPU inference at <strong className="text-purple-300">0.14 RTF</strong>.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-purple-400 font-medium">
            <span>Great if you need custom style latent control.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
