import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STANDARD_BENCHMARK_SUITE,
  ARGON_GATES_CRITERIA,
  evaluateArgonGates,
  recommendNextRefinement,
  ArgonIterationReport
} from './argon-judge';

test('STANDARD_BENCHMARK_SUITE contains Harvard IEEE, LibriSpeech, and Prosody tests', () => {
  const categories = STANDARD_BENCHMARK_SUITE.map((s) => s.category);
  assert.ok(categories.includes('harvard-ieee'));
  assert.ok(categories.includes('librispeech-clean'));
  assert.ok(categories.includes('conversational-prosody'));
  assert.ok(STANDARD_BENCHMARK_SUITE.length >= 6);
});

test('evaluateArgonGates properly tests all 4 criteria gates', () => {
  // Passing candidate
  const passed = evaluateArgonGates({
    werPercent: 1.75,
    utmosScore: 4.65,
    f0VarianceHz: 32.5,
    cpuRtf: 0.078
  });
  assert.equal(passed.certified, true);
  assert.equal(passed.gatesPassedCount, 4);
  assert.equal(passed.werGate, true);
  assert.equal(passed.utmosGate, true);
  assert.equal(passed.f0Gate, true);
  assert.equal(passed.rtfGate, true);

  // Failing F0 variance gate
  const lowF0 = evaluateArgonGates({
    werPercent: 1.80,
    utmosScore: 4.55,
    f0VarianceHz: 22.0, // Low variance
    cpuRtf: 0.078
  });
  assert.equal(lowF0.certified, false);
  assert.equal(lowF0.f0Gate, false);
  assert.equal(lowF0.gatesPassedCount, 3);
});

test('recommendNextRefinement prescribes correct recursive action', () => {
  const mockReportLowF0: ArgonIterationReport = {
    iteration: 1,
    augmentationApplied: 'Initial Baseline',
    overallWerPercent: 1.85,
    overallUtmosMOS: 4.55,
    overallF0VarianceHz: 24.0, // Below 28Hz
    cpuRtfUbuntu: 0.08,
    cpuRtfAppleM1: 0.09,
    gatesPassed: 3,
    allGatesPassed: false,
    argonVerdict: 'REVISE_AUGMENT',
    timestamp: '2026-10-28 13:20:00',
    resultsBySentence: []
  };

  const rec = recommendNextRefinement(mockReportLowF0);
  assert.equal(rec.augmentationName, 'Style Diffusion Prior Variance Expansion');
  assert.ok(rec.rationale.includes('F0 pitch contour variance'));
});
