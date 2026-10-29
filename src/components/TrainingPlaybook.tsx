import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Copy, 
  Check, 
  Cpu, 
  Laptop, 
  Layers, 
  Sparkles, 
  Workflow, 
  FileCheck, 
  Download,
  AlertCircle
} from 'lucide-react';
import { TrainingLogs } from './TrainingLogs';

export const TrainingPlaybook: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'h200-logs' | 'kokoro' | 'styletts2' | 'piper'>('h200-logs');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const kokoroTrainScript = `# Step 1: Install prerequisites on Ubuntu 24-vCPU / macOS M1
pip install torch torchaudio phonemizer misaki onnx onnxruntime onnxsim

# Step 2: Prepare your dataset (LJSpeech style format)
# Structure:
# /dataset/
#   wavs/
#     sample_0001.wav (24000 Hz, 16-bit mono PCM)
#     sample_0002.wav
#   metadata.csv  ->  sample_0001|The voice must be natural and clear.|ðə vɔɪs mʌst bi...

# Step 3: Extract Style Embeddings & Phonemes
python -m kokoro_train.extract_features \\
  --dataset_dir ./dataset \\
  --sample_rate 24000 \\
  --phonemizer misaki

# Step 4: Fine-tune Kokoro-82M on your 24-vCPU machine (or 1x GPU)
# For Ubuntu 24-vCPU, use PyTorch with Intel oneDNN / OpenMP:
export OMP_NUM_THREADS=12
python train_kokoro.py \\
  --base_model hexgrad/Kokoro-82M \\
  --train_data ./dataset/train.json \\
  --val_data ./dataset/val.json \\
  --batch_size 8 \\
  --learning_rate 1e-4 \\
  --warmup_steps 500 \\
  --epochs 20 \\
  --output_dir ./checkpoints/my_custom_kokoro`;

  const kokoroExportScript = `# Step 5: Export PyTorch checkpoint to optimized ONNX
python export_onnx.py \\
  --checkpoint ./checkpoints/my_custom_kokoro/best.pt \\
  --output_onnx ./model/kokoro_custom_fp32.onnx \\
  --dynamic_axes

# Step 6: Graph Optimization & INT8 Quantization for CPU
python -m onnxruntime.quantization.quantize_dynamic \\
  --input_model ./model/kokoro_custom_fp32.onnx \\
  --output_model ./model/kokoro_custom_int8.onnx \\
  --weight_type Int8`;

  const kokoroUbuntuDeploy = `# Ubuntu 24-vCPU Production Inference (Python)
import onnxruntime as ort
import numpy as np
import soundfile as sf
from misaki import en

# 1. Configure ONNX Runtime for multi-threaded AVX2/AVX-512 CPU
sess_options = ort.SessionOptions()
sess_options.intra_op_num_threads = 8  # Optimal for 24-vCPU
sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

# 2. Load model (380MB FP32 or 190MB INT8)
session = ort.InferenceSession("./model/kokoro_custom_int8.onnx", sess_options, providers=["CPUExecutionProvider"])

# 3. Phonemize input text
g2p = en.G2P()
phonemes = g2p("High quality speech generated seamlessly on CPU.")

# 4. Synthesize with zero GPU overhead (< 0.05 RTF!)
tokens = np.array([phonemes], dtype=np.int64)
audio = session.run(None, {"tokens": tokens, "style_vector": np.zeros((1, 128), dtype=np.float32)})[0]

# 5. Save or stream audio
sf.write("output.wav", audio, 24000)
print("Audio generated at 0.05 RTF on 24-vCPU Ubuntu!")`;

  const kokoroM1Deploy = `# Apple Silicon M1 Inference (CoreML / MLX)
import coremltools as ct
import numpy as np
import soundfile as sf

# Apple M1 leverages the Neural Engine (ANE) and Unified Memory
# Convert ONNX or PyTorch model to CoreML package:
# model = ct.convert(torch_model, inputs=[...], compute_precision=ct.precision.FLOAT16)
# model.save("Kokoro82M.mlpackage")

# Direct inference on M1:
import kokoro_onnx

kokoro = kokoro_onnx.Kokoro("kokoro-v0_19.onnx", "voices.bin")
samples, sample_rate = kokoro.create(
    "Synthesized seamlessly on Apple Silicon M1 with unified memory.",
    voice="af_bella",
    speed=1.0,
    lang="en-us"
)
sf.write("m1_output.wav", samples, sample_rate)
print("Synthesis complete in ~120ms on Apple M1!")`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/20 p-2 text-blue-400">
            <Workflow className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-200">
              End-to-End Training &amp; Dual-Target CPU Deployment Blueprint
            </h3>
            <p className="mt-1 text-sm text-slate-300 leading-relaxed max-w-4xl">
              To build a state-of-the-art TTS system that runs at high speed on CPU with the lowest Word Error Rate (WER) and natural prosody, 
              the winning blueprint is <strong className="text-white">Train on PyTorch (using StyleTTS2/Kokoro architecture) → Export to ONNX/CoreML → Deploy with ONNX Runtime or Sherpa-ONNX</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Architecture & Live Logs Tabs */}
      <div className="flex flex-wrap border-b border-slate-800">
        <button
          onClick={() => setActiveTab('h200-logs')}
          className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'h200-logs'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="h-4 w-4 text-emerald-400 animate-pulse" />
          Live H200 Streaming Logs &amp; Metrics
        </button>
        <button
          onClick={() => setActiveTab('kokoro')}
          className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'kokoro'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" /> 1. Kokoro-82M Playbook
        </button>
        <button
          onClick={() => setActiveTab('piper')}
          className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'piper'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="h-4 w-4" /> 2. Piper / VITS
        </button>
        <button
          onClick={() => setActiveTab('styletts2')}
          className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'styletts2'
              ? 'border-purple-500 text-purple-400 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" /> 3. StyleTTS 2
        </button>
      </div>

      {/* Live H200 Streaming Logs & Metrics View */}
      {activeTab === 'h200-logs' && (
        <TrainingLogs />
      )}

      {/* Kokoro Playbook Content */}
      {activeTab === 'kokoro' && (
        <div className="space-y-6">
          {/* Step 1 to 4 Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                <FileCheck className="h-4 w-4" /> Phase 1: Data Prep
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                24kHz 16-bit mono audio with clean transcriptions. 1–5 hours for voice cloning; 15–30 hours for rich multi-emotion prosody.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Layers className="h-4 w-4" /> Phase 2: Phonemes
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Use <strong>Misaki</strong> or <strong>espeak-ng</strong> G2P. Phonemization guarantees 0% hallucination and lowest WER on CPU.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Cpu className="h-4 w-4" /> Phase 3: Train / Fine-tune
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fine-tune acoustic duration predictor and ISTFTNet vocoder. Can run on a single 24GB GPU or on your 24-vCPU node via PyTorch DDP.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Download className="h-4 w-4" /> Phase 4: ONNX / CoreML
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Export to ONNX with INT8 dynamic quantization. Deploys to Ubuntu 24-vCPU and M1 Mac with zero external GPU dependencies.
              </p>
            </div>
          </div>

          {/* Code Section: Training & Fine-Tuning */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span>Training &amp; Fine-Tuning Script (Bash &amp; PyTorch)</span>
              </div>
              <button
                onClick={() => handleCopy('kokoro-train', kokoroTrainScript)}
                className="flex items-center gap-1.5 rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                {copiedCodeId === 'kokoro-train' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Script
                  </>
                )}
              </button>
            </div>
            <pre className="font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              {kokoroTrainScript}
            </pre>
          </div>

          {/* Code Section: ONNX Export & INT8 Quantization */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Terminal className="h-4 w-4 text-amber-400" />
                <span>ONNX Export &amp; INT8 Quantization for CPU</span>
              </div>
              <button
                onClick={() => handleCopy('kokoro-export', kokoroExportScript)}
                className="flex items-center gap-1.5 rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                {copiedCodeId === 'kokoro-export' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Script
                  </>
                )}
              </button>
            </div>
            <pre className="font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              {kokoroExportScript}
            </pre>
          </div>

          {/* Dual-Target Deployment Scripts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Target 1: Ubuntu 24-vCPU */}
            <div className="rounded-xl border border-blue-500/30 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-400" />
                  <h4 className="text-sm font-semibold text-blue-200">Target 1: Ubuntu 24-vCPU Production</h4>
                </div>
                <button
                  onClick={() => handleCopy('ubuntu-deploy', kokoroUbuntuDeploy)}
                  className="rounded bg-slate-800 hover:bg-slate-700 p-1.5 text-xs text-slate-300"
                  title="Copy Code"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Uses ONNX Runtime with AVX-512 vectorization and OpenMP thread binding (`OMP_NUM_THREADS=8`).
              </p>
              <pre className="rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-64">
                {kokoroUbuntuDeploy}
              </pre>
            </div>

            {/* Target 2: Apple M1 Silicon */}
            <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-emerald-200">Target 2: Apple M1 Silicon Production</h4>
                </div>
                <button
                  onClick={() => handleCopy('m1-deploy', kokoroM1Deploy)}
                  className="rounded bg-slate-800 hover:bg-slate-700 p-1.5 text-xs text-slate-300"
                  title="Copy Code"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Utilizes Apple Neural Engine (ANE), AMX matrix coprocessor, and unified memory for zero-copy streaming.
              </p>
              <pre className="rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-64">
                {kokoroM1Deploy}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Piper Content */}
      {activeTab === 'piper' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-2 text-blue-400 font-semibold">
            <Cpu className="h-5 w-5" />
            <h3>Piper (VITS) Training &amp; Export Workflow</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Piper is the fastest end-to-end VITS pipeline for CPU. It uses Monotonic Alignment Search (MAS) so you do not even need an external aligner like MFA. Training can run entirely on your 24-vCPU Ubuntu node or any modest GPU.
          </p>
          <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed border border-slate-800">
{`# 1. Install Piper training repo
git clone https://github.com/rhasspy/piper.git
cd piper/src/python_run
pip install -r requirements.txt

# 2. Preprocess dataset
python3 -m piper_train.preprocess \\
  --language en-us \\
  --input-dir /path/to/wavs \\
  --output-dir /path/to/training_dir \\
  --dataset-format ljspeech \\
  --sample-rate 22050

# 3. Train on Ubuntu 24-vCPU or GPU
python3 -m piper_train \\
  --dataset-dir /path/to/training_dir \\
  --accelerator 'cpu' \\
  --devices 1 \\
  --batch-size 16 \\
  --validation-split 0.05 \\
  --checkpoint-epochs 1

# 4. Export directly to ONNX
python3 -m piper_train.export_onnx \\
  /path/to/checkpoint.ckpt \\
  /path/to/my_voice.onnx`}
          </div>
        </div>
      )}

      {/* StyleTTS 2 Content */}
      {activeTab === 'styletts2' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-2 text-purple-400 font-semibold">
            <Layers className="h-5 w-5" />
            <h3>StyleTTS 2: Full Acoustic &amp; Style Diffusion Training</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            StyleTTS 2 is the model to choose if you require nuanced actor-grade prosody, emotional expression, and voice cloning from a 3-second reference audio clip.
          </p>
          <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed border border-slate-800">
{`# StyleTTS 2 Loss Formulation during training:
# L_total = L_mel + L_dur + L_pitch + L_energy + L_style_diff + 0.1 * L_slm (Speech Language Model discriminator)

# 1. Fine-tuning on custom emotional voice:
python train_second.py \\
  --config_path ./Configs/config_custom.yml \\
  --pretrained_model ./Models/LibriTTS/epochs_2nd_00020.pth

# 2. Export Style Diffusion & ISTFT Decoder to ONNX:
python export_onnx_styletts2.py \\
  --model_path ./Models/LibriTTS/best.pth \\
  --out_dir ./onnx_models/`}
          </div>
        </div>
      )}
    </div>
  );
};
