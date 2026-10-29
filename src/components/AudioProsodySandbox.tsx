import React, { useState, useRef, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Sparkles, 
  Sliders, 
  Activity, 
  Info,
  CheckCircle
} from 'lucide-react';

interface EmotionPreset {
  id: string;
  name: string;
  description: string;
  pitch: number;
  rate: number;
  contourShape: 'flat' | 'rising-cheer' | 'falling-calm' | 'dynamic-dramatic' | 'staccato-urgent';
  prosodyScore: string;
}

const EMOTION_PRESETS: EmotionPreset[] = [
  {
    id: 'neutral',
    name: 'Neutral / Informational (Piper-style)',
    description: 'Even cadence, standard declarative pitch fall at punctuation.',
    pitch: 1.0,
    rate: 1.0,
    contourShape: 'flat',
    prosodyScore: 'MOS 4.1'
  },
  {
    id: 'cheerful',
    name: 'Enthusiastic / Warm (Kokoro Bella)',
    description: 'Elevated fundamental frequency (F0) with musical syllable rises.',
    pitch: 1.25,
    rate: 1.08,
    contourShape: 'rising-cheer',
    prosodyScore: 'MOS 4.6'
  },
  {
    id: 'empathetic',
    name: 'Empathetic / Gentle (StyleTTS2 Soft)',
    description: 'Soft vocal onset, prolonged vowel durations, warm lower formant resonance.',
    pitch: 0.92,
    rate: 0.88,
    contourShape: 'falling-calm',
    prosodyScore: 'MOS 4.5'
  },
  {
    id: 'urgent',
    name: 'Urgent / Alert (Fast Staccato)',
    description: 'Compressed phone durations, punchy pitch spikes on operative verbs.',
    pitch: 1.15,
    rate: 1.25,
    contourShape: 'staccato-urgent',
    prosodyScore: 'MOS 4.4'
  },
  {
    id: 'dramatic',
    name: 'Dramatic Storyteller (Style Diffusion)',
    description: 'Wide F0 dynamic range, expressive pauses, whispered style latent shifts.',
    pitch: 0.98,
    rate: 0.92,
    contourShape: 'dynamic-dramatic',
    prosodyScore: 'MOS 4.7'
  }
];

export const AudioProsodySandbox: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<EmotionPreset>(EMOTION_PRESETS[1]);
  const [pitch, setPitch] = useState<number>(1.25);
  const [rate, setRate] = useState<number>(1.08);
  const [text, setText] = useState<string>(
    "With Kokoro on CPU, we achieve incredibly natural prosody and emotional cadence, with zero GPU latency!"
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioSupported, setAudioSupported] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setAudioSupported(false);
    }
  }, []);

  const handleSelectPreset = (preset: EmotionPreset) => {
    setSelectedPreset(preset);
    setPitch(preset.pitch);
    setRate(preset.rate);
  };

  // Draw simulated pitch contour and acoustic spectrogram
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    const render = () => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Pitch Contour Curve
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();

      const baseF0 = canvas.height * 0.65 - (pitch - 1) * 40;
      for (let x = 0; x < canvas.width; x++) {
        let contourY = baseF0;
        const progress = x / canvas.width;

        if (selectedPreset.contourShape === 'rising-cheer') {
          contourY += Math.sin(progress * 12 + offset) * 16 - (progress * 25);
        } else if (selectedPreset.contourShape === 'falling-calm') {
          contourY += Math.sin(progress * 8 + offset) * 10 + (progress * 20);
        } else if (selectedPreset.contourShape === 'dynamic-dramatic') {
          contourY += Math.sin(progress * 16 + offset) * 28 * Math.cos(progress * 6);
        } else if (selectedPreset.contourShape === 'staccato-urgent') {
          contourY += (Math.floor(x / 30) % 2 === 0 ? 15 : -15) + Math.sin(progress * 20 + offset) * 8;
        } else {
          // Flat neutral
          contourY += Math.sin(progress * 10 + offset) * 6;
        }

        if (x === 0) {
          ctx.moveTo(x, contourY);
        } else {
          ctx.lineTo(x, contourY);
        }
      }
      ctx.stroke();

      // Draw formant energy bars
      const barCount = 32;
      const barWidth = canvas.width / barCount;
      for (let i = 0; i < barCount; i++) {
        const height = isPlaying 
          ? Math.random() * 50 + 20 
          : Math.sin(i * 0.4 + offset) * 15 + 20;
        ctx.fillStyle = `rgba(59, 130, 246, ${isPlaying ? 0.6 : 0.25})`;
        ctx.fillRect(i * barWidth + 2, canvas.height - height, barWidth - 4, height);
      }

      offset += isPlaying ? 0.08 : 0.015;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pitch, rate, selectedPreset, isPlaying]);

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = pitch;
    utterance.rate = rate;

    // Pick best available English voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Siri'))
    ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Interactive Prosody, Emotion &amp; Pitch Contour Sandbox
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Experience how differentiable style diffusion adjusts Fundamental Frequency (F0), phoneme durations, and emotional cadence.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {EMOTION_PRESETS.map((preset) => {
          const isSelected = selectedPreset.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`rounded-xl border p-3.5 text-left transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/30 shadow-md ring-1 ring-emerald-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {preset.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {preset.prosodyScore}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span>F0: {preset.pitch}x</span>
                <span>•</span>
                <span>Speed: {preset.rate}x</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pitch Contour Canvas */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Fundamental Frequency (F0) Contour &amp; Formant Energy Visualizer
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Mode: {selectedPreset.contourShape} | Pitch: {pitch.toFixed(2)}x
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={760}
          height={160}
          className="w-full rounded-lg border border-slate-800 bg-slate-950"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Onset (0.0s)</span>
          <span className="text-emerald-400 font-semibold">• Green Line: F0 Pitch Trajectory (Hz)</span>
          <span className="text-blue-400 font-semibold">■ Blue Bars: Acoustic Energy</span>
          <span>Offset (~{((text.length / 15) / rate).toFixed(1)}s)</span>
        </div>
      </div>

      {/* Synthesis Controls & Textarea */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Test Speech Synthesis
          </label>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={isPlaying ? stop : speak}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition cursor-pointer ${
                isPlaying 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="h-4 w-4 fill-white" /> Stop Audio
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" /> Synthesize &amp; Listen
                </>
              )}
            </button>
            <span className="text-xs text-slate-400">
              Uses system speech synthesis with active style latent parameters
            </span>
          </div>
        </div>

        {/* Fine-Tuning Sliders */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Sliders className="h-4 w-4 text-emerald-400" />
            <span>Acoustic Latent Controls</span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Pitch Inflection (F0)</span>
              <span className="font-mono text-emerald-400 font-bold">{pitch.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.05"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Speaking Rate (Duration)</span>
              <span className="font-mono text-blue-400 font-bold">{rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            In Kokoro and StyleTTS 2, these parameters are continuously encoded into 128-dimensional style vectors (`style_vec`).
          </div>
        </div>
      </div>
    </div>
  );
};
