import React, { useState } from 'react';
import { 
  TTS_CANDIDATES, 
  estimateInferencePerformance,
  LatencyEstimate 
} from '../utils/tts-benchmark';
import { 
  Cpu, 
  Laptop, 
  Zap, 
  Clock, 
  HardDrive, 
  Activity, 
  Gauge, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';

export const HardwareSimulator: React.FC = () => {
  const [selectedModelId, setSelectedModelId] = useState<string>('kokoro-82m');
  const [targetHardware, setTargetHardware] = useState<'ubuntu-24vcpu' | 'apple-m1'>('ubuntu-24vcpu');
  const [quantization, setQuantization] = useState<'fp32' | 'int8'>('fp32');
  const [wordCount, setWordCount] = useState<number>(45);
  const [threads, setThreads] = useState<number>(8);
  const [sampleText, setSampleText] = useState<string>(
    "Building an ultra-fast text-to-speech system requires balancing acoustic fidelity with CPU vectorization efficiency. With Kokoro, synthesis happens faster than thought."
  );

  const handleTextChange = (text: string) => {
    setSampleText(text);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(Math.max(5, words));
  };

  const performance = estimateInferencePerformance({
    modelId: selectedModelId,
    wordCount,
    targetHardware,
    quantization,
    threads
  });

  const selectedModel = TTS_CANDIDATES.find((m) => m.id === selectedModelId) || TTS_CANDIDATES[0];

  // Concurrency calculation: how many simultaneous real-time streams can the target hardware support?
  // On Ubuntu 24-vCPU: total capacity = 24 cores / (effective RTF * 4 cores per stream)
  const maxConcurrentStreams = targetHardware === 'ubuntu-24vcpu' 
    ? performance.rtf > 1.0 ? 0 : Math.min(48, Math.floor(1.0 / performance.rtf * 1.8))
    : performance.rtf > 1.0 ? 0 : Math.min(16, Math.floor(1.0 / performance.rtf * 0.9));

  return (
    <div className="space-y-6">
      {/* Configuration Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Model Candidate
          </label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TTS_CANDIDATES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.parameterCountM}M - {m.architectureType})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Target Hardware Environment
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setTargetHardware('ubuntu-24vcpu');
                if (threads > 16) setThreads(8);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                targetHardware === 'ubuntu-24vcpu'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" /> Ubuntu 24-vCPU
            </button>
            <button
              onClick={() => {
                setTargetHardware('apple-m1');
                if (threads > 8) setThreads(4);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                targetHardware === 'apple-m1'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" /> Apple M1 Mac
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Quantization Precision
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setQuantization('fp32')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                quantization === 'fp32'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              FP32 (Original)
            </button>
            <button
              onClick={() => setQuantization('int8')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                quantization === 'int8'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              INT8 (Quantized ONNX)
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Inference Threads: {threads}
            </label>
            <span className="text-[11px] text-slate-400">
              {targetHardware === 'ubuntu-24vcpu' ? 'Max 24 vCPUs' : 'Max 8 Cores'}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={targetHardware === 'ubuntu-24vcpu' ? 24 : 8}
            value={threads}
            onChange={(e) => setThreads(parseInt(e.target.value, 10))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Text Prompt Input Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Synthesized Prompt ({wordCount} words, ~{performance.estimatedSpeechDurationSec}s audio duration)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTextChange("Hello world, this is a quick CPU inference test.")}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              Short (9 words)
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => handleTextChange("Building an ultra-fast text-to-speech system requires balancing acoustic fidelity with CPU vectorization efficiency. With Kokoro, synthesis happens faster than thought.")}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              Medium (23 words)
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => handleTextChange("Modern neural speech synthesis represents a profound convergence of differentiable alignment, style diffusion, and vectorized vocoders. When deployed on high-core-count CPU architectures, such as a 24 vCPU Ubuntu node with AVX-512 extensions or an Apple Silicon M1 workstation with unified memory, non-autoregressive architectures completely bypass the memory bandwidth bottlenecks that cripple traditional autoregressive transformers.")}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              Long Paragraph (56 words)
            </button>
          </div>
        </div>
        <textarea
          rows={3}
          value={sampleText}
          onChange={(e) => handleTextChange(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type or paste sentences here to test latency and RTF..."
        />
      </div>

      {/* Real-Time Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* RTF Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg relative overflow-hidden">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Real-Time Factor (RTF)</span>
            <Gauge className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${
              performance.rtf < 0.15 ? 'text-emerald-400' : performance.rtf < 0.5 ? 'text-blue-400' : performance.rtf < 1.0 ? 'text-amber-400' : 'text-rose-500'
            }`}>
              {performance.rtf}x
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {performance.rtf < 1.0 ? `${performance.speedRatioVsRealtime}x Faster than Audio` : 'Lagging Behind Audio'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {performance.rtf < 1.0 
              ? 'Real-time streaming is seamless with negligible buffer delay.' 
              : 'Cannot stream in real-time on CPU; audio skips.'}
          </p>
        </div>

        {/* Generation Time Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Total Generation Time</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400">
              {performance.generationTimeSec}s
            </span>
            <span className="text-xs text-slate-400">
              for {performance.estimatedSpeechDurationSec}s audio
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            TTFB: <strong className="text-slate-200">{performance.timeToFirstByteMs}ms</strong> to first chunk
          </div>
        </div>

        {/* Memory Footprint Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>RAM Footprint</span>
            <HardDrive className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-purple-400">
              {performance.memoryUsageMb} MB
            </span>
            <span className="text-xs text-slate-400">active memory</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {performance.memoryUsageMb < 500 ? 'Ultra-lightweight; fits in small Docker container' : 'Medium footprint'}
          </p>
        </div>

        {/* Concurrency Capacity */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Concurrency on {targetHardware === 'ubuntu-24vcpu' ? '24 vCPUs' : 'M1'}</span>
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-amber-400">
              {maxConcurrentStreams}
            </span>
            <span className="text-xs text-slate-400">simultaneous streams</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {maxConcurrentStreams > 10 ? 'High concurrency ready for production backend API' : 'Limited concurrency'}
          </p>
        </div>
      </div>

      {/* Engineering Assessment Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          Detailed Hardware Profile &amp; Bottleneck Analysis for {selectedModel.name}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg bg-slate-950 p-4 border border-slate-800">
            <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
              Target Hardware Optimization Paths
            </span>
            {targetHardware === 'ubuntu-24vcpu' ? (
              <div className="text-slate-300 space-y-1.5 leading-relaxed">
                <p>• <strong>AVX-512 / AVX2 Vectorization:</strong> Uses Intel/AMD SIMD registers to process 8 or 16 float operations per clock cycle in parallel.</p>
                <p>• <strong>OpenMP Multi-threading:</strong> Scale inference threads to 4–8 per worker for maximum cache affinity without hyperthread contention.</p>
                <p>• <strong>Recommended Engine:</strong> ONNX Runtime with OpenVINO / CPU execution provider or Sherpa-ONNX.</p>
              </div>
            ) : (
              <div className="text-slate-300 space-y-1.5 leading-relaxed">
                <p>• <strong>Apple AMX (Apple Matrix Coprocessor) &amp; NEON:</strong> Unified memory provides ~68 GB/s bandwidth with zero PCIe transfer penalty.</p>
                <p>• <strong>CoreML / Accelerate Framework:</strong> Direct compilation into Apple Neural Engine (ANE) or Accelerate BLAS routines.</p>
                <p>• <strong>Recommended Engine:</strong> MLX or ONNX Runtime with CoreML Execution Provider.</p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-slate-950 p-4 border border-slate-800">
            <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block mb-1">
              Hardware Bottleneck Verdict
            </span>
            <div className="text-slate-300 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Primary Bottleneck:</span>
                <span className={`font-semibold ${
                  performance.hardwareBottleneck === 'None (Optimal)' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {performance.hardwareBottleneck}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Viability:</span>
                <span className="font-semibold text-slate-100">{performance.recommendation}</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {selectedModel.summary}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
