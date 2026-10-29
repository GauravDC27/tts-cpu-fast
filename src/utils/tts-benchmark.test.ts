import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TTS_CANDIDATES,
  calculateRTF,
  estimateInferencePerformance,
  filterCandidates,
  getKokoroVsStyleTTS2Comparison,
  calculateKokoroNaturalnessGains
} from './tts-benchmark';

test('TTS_CANDIDATES contains essential models including Kokoro-82M and OmniVoice', () => {
  const ids = TTS_CANDIDATES.map((c) => c.id);
  assert.ok(ids.includes('kokoro-82m'), 'Kokoro-82M must be present');
  assert.ok(ids.includes('styletts-2'), 'StyleTTS 2 must be present');
  assert.ok(ids.includes('piper-vits'), 'Piper must be present');
  assert.ok(ids.includes('omnivoice-cosyvoice'), 'OmniVoice must be present');
});

test('calculateRTF computes correct real-time factors', () => {
  // 10s audio generated in 1s => RTF 0.1
  const rtf = calculateRTF(10, 1);
  assert.equal(rtf, 0.1);

  // 5s audio generated in 10s => RTF 2.0 (slower than real-time)
  const rtfSlow = calculateRTF(5, 10);
  assert.equal(rtfSlow, 2.0);

  // Zero duration safe guard
  assert.equal(calculateRTF(0, 10), 0);
});

test('estimateInferencePerformance accurately reflects Kokoro CPU superiority vs OmniVoice bottleneck', () => {
  const kokoroEst = estimateInferencePerformance({
    modelId: 'kokoro-82m',
    wordCount: 50, // 20 seconds speech
    targetHardware: 'ubuntu-24vcpu',
    quantization: 'fp32',
    threads: 8
  });

  const omniEst = estimateInferencePerformance({
    modelId: 'omnivoice-cosyvoice',
    wordCount: 50,
    targetHardware: 'ubuntu-24vcpu',
    quantization: 'fp32',
    threads: 8
  });

  assert.ok(kokoroEst.isRealTime, 'Kokoro should be well within real-time');
  assert.ok(kokoroEst.rtf < 0.2, 'Kokoro RTF should be < 0.2 on CPU');
  assert.equal(kokoroEst.recommendation, 'Highly Recommended');

  assert.ok(!omniEst.isRealTime, 'OmniVoice on CPU should fail real-time requirement (RTF > 1.0)');
  assert.equal(omniEst.recommendation, 'Not Recommended for CPU');
  assert.equal(omniEst.hardwareBottleneck, 'Sequential Dependency');
});

test('filterCandidates properly filters models by RTF and WER thresholds', () => {
  const cpuReady = filterCandidates(TTS_CANDIDATES, {
    maxRtf: 0.2,
    maxWer: 3.0,
    targetHardware: 'ubuntu-24vcpu'
  });

  const names = cpuReady.map((c) => c.id);
  assert.ok(names.includes('kokoro-82m'));
  assert.ok(names.includes('piper-vits'));
  assert.ok(!names.includes('omnivoice-cosyvoice'), 'Omnivoice should be filtered out by RTF');
});

test('getKokoroVsStyleTTS2Comparison verifies StyleTTS2 CPU compatibility and RTF ratio', () => {
  const comparison = getKokoroVsStyleTTS2Comparison();
  assert.equal(comparison.isStyleTTS2CpuCompatible, true, 'StyleTTS2 IS CPU compatible');
  assert.ok(comparison.kokoroCpuRTF.ubuntu24vCpu < comparison.styleTTS2CpuRTF.ubuntu24vCpu, 'Kokoro is faster on CPU');
  assert.ok(comparison.whyStyleTTS2SoundsMoreNaturalDefault.length >= 2);
  assert.ok(comparison.howToBridgeNaturalnessGapInKokoro.length >= 3);
});

test('calculateKokoroNaturalnessGains shows training with SLM loss restores StyleTTS2 naturalness without CPU inference penalty', () => {
  const defaultGains = calculateKokoroNaturalnessGains({
    enableSlmLoss: false,
    styleEmbeddingQuality: 'static-normalized',
    expressiveDatasetHours: 2,
    istftFineTuning: false
  });

  const fullTrainedGains = calculateKokoroNaturalnessGains({
    enableSlmLoss: true,
    styleEmbeddingQuality: 'high-variance-dynamic',
    expressiveDatasetHours: 15,
    istftFineTuning: true
  });

  assert.ok(fullTrainedGains.predictedNaturalnessMOS > defaultGains.predictedNaturalnessMOS);
  assert.ok(fullTrainedGains.predictedNaturalnessMOS >= 4.7, 'Naturalness should reach 4.7+ MOS');
  assert.equal(fullTrainedGains.rtfPenalty, 0.0, 'Inference RTF remains completely unpenalized');
});

