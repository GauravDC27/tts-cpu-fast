/**
 * Argon Autonomous Evaluation Judge & Benchmark Types
 */

export interface BenchmarkSentence {
  id: string;
  category: 'harvard-ieee' | 'librispeech-clean' | 'conversational-prosody';
  text: string;
  expectedDurationSec: number;
  minTargetF0VarianceHz: number;
}

export interface ArgonSentenceResult {
  sentenceId: string;
  text: string;
  category: string;
  werPercent: number;
  utmosScore: number; // 1-5 scale
  f0VarianceHz: number;
  estimatedCpuRtf: number;
  passedGates: {
    werGate: boolean;
    utmosGate: boolean;
    f0Gate: boolean;
    rtfGate: boolean;
  };
  overallPass: boolean;
}

export interface ArgonIterationReport {
  iteration: number;
  augmentationApplied: string;
  overallWerPercent: number;
  overallUtmosMOS: number;
  overallF0VarianceHz: number;
  cpuRtfUbuntu: number;
  cpuRtfAppleM1: number;
  gatesPassed: number; // 0 to 4
  allGatesPassed: boolean;
  argonVerdict: 'REVISE_AUGMENT' | 'ARGON_CERTIFIED_GOLD';
  timestamp: string;
  resultsBySentence: ArgonSentenceResult[];
}

export const STANDARD_BENCHMARK_SUITE: BenchmarkSentence[] = [
  // Harvard Sentences (IEEE Standard)
  {
    id: 'harvard-1',
    category: 'harvard-ieee',
    text: 'The birch canoe slid on the smooth planks.',
    expectedDurationSec: 2.8,
    minTargetF0VarianceHz: 26.0
  },
  {
    id: 'harvard-2',
    category: 'harvard-ieee',
    text: 'Glue the sheet to the dark blue background.',
    expectedDurationSec: 2.9,
    minTargetF0VarianceHz: 25.0
  },
  {
    id: 'harvard-3',
    category: 'harvard-ieee',
    text: 'These days a chicken leg is a rare dish.',
    expectedDurationSec: 3.1,
    minTargetF0VarianceHz: 28.0
  },
  // LibriSpeech Test-Clean
  {
    id: 'libri-1',
    category: 'librispeech-clean',
    text: 'He had not been observed, and he slipped through the door with stealthy swiftness.',
    expectedDurationSec: 5.2,
    minTargetF0VarianceHz: 30.0
  },
  {
    id: 'libri-2',
    category: 'librispeech-clean',
    text: 'The fundamental objective of neural alignment is deterministic speech cadence without degradation.',
    expectedDurationSec: 6.4,
    minTargetF0VarianceHz: 29.0
  },
  // Conversational & Emotional Prosody
  {
    id: 'prosody-question',
    category: 'conversational-prosody',
    text: 'Could you really run this full speech synthesis pipeline on a single CPU core without dropping frames?',
    expectedDurationSec: 5.6,
    minTargetF0VarianceHz: 36.0 // High pitch rise for question
  },
  {
    id: 'prosody-cheerful',
    category: 'conversational-prosody',
    text: 'That sounds absolutely wonderful! We just reached parity with heavy GPU architectures.',
    expectedDurationSec: 4.8,
    minTargetF0VarianceHz: 34.0
  },
  {
    id: 'prosody-empathetic',
    category: 'conversational-prosody',
    text: 'I understand this was a complex constraint, but your patience and clarity made the outcome possible.',
    expectedDurationSec: 6.2,
    minTargetF0VarianceHz: 28.0
  }
];

export const ARGON_GATES_CRITERIA = {
  maxAllowedWer: 1.95, // Gate A: WER <= 1.95%
  minRequiredUtmos: 4.50, // Gate B: UTMOS >= 4.50/5.0
  minRequiredF0Variance: 28.0, // Gate C: Pitch contour dynamic variance >= 28Hz
  maxAllowedCpuRtf: 0.085 // Gate D: CPU RTF <= 0.085x on 24-vCPU
};

export function evaluateArgonGates(metrics: {
  werPercent: number;
  utmosScore: number;
  f0VarianceHz: number;
  cpuRtf: number;
}): {
  werGate: boolean;
  utmosGate: boolean;
  f0Gate: boolean;
  rtfGate: boolean;
  gatesPassedCount: number;
  certified: boolean;
} {
  const werGate = metrics.werPercent <= ARGON_GATES_CRITERIA.maxAllowedWer;
  const utmosGate = metrics.utmosScore >= ARGON_GATES_CRITERIA.minRequiredUtmos;
  const f0Gate = metrics.f0VarianceHz >= ARGON_GATES_CRITERIA.minRequiredF0Variance;
  const rtfGate = metrics.cpuRtf <= ARGON_GATES_CRITERIA.maxAllowedCpuRtf;

  const count = [werGate, utmosGate, f0Gate, rtfGate].filter(Boolean).length;
  const certified = count === 4;

  return {
    werGate,
    utmosGate,
    f0Gate,
    rtfGate,
    gatesPassedCount: count,
    certified
  };
}

export function recommendNextRefinement(
  report: ArgonIterationReport
): { augmentationName: string; rationale: string; targetLossAdjustment: string } {
  if (report.overallWerPercent > ARGON_GATES_CRITERIA.maxAllowedWer) {
    return {
      augmentationName: 'Phonetic Duration Constraint & Punctuation MAS Alignment',
      rationale: 'WER exceeded 1.95%. Apply monotonic duration loss tightening around plosives and pauses.',
      targetLossAdjustment: 'lambda_dur += 0.05, apply strict MAS threshold'
    };
  }

  if (report.overallF0VarianceHz < ARGON_GATES_CRITERIA.minRequiredF0Variance) {
    return {
      augmentationName: 'Style Diffusion Prior Variance Expansion',
      rationale: 'F0 pitch contour variance is below 28Hz. Expand style latent manifold sampling variance.',
      targetLossAdjustment: 'lambda_style_diff += 0.08, scale style noise temperature 1.15x'
    };
  }

  if (report.overallUtmosMOS < ARGON_GATES_CRITERIA.minRequiredUtmos) {
    return {
      augmentationName: 'Speech Language Model (WavLM) Perceptual Loss Boosting',
      rationale: 'Naturalness MOS is below 4.50. Increase SLM adversarial discriminator weight for vocal fry & breath.',
      targetLossAdjustment: 'lambda_slm: 0.10 -> 0.15'
    };
  }

  return {
    augmentationName: 'Optimal Convergence Reached',
    rationale: 'All Argon Gates Passed: Model is certified for production deployment.',
    targetLossAdjustment: 'Freeze weights and trigger INT8 static graph export'
  };
}
