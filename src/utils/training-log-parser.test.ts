import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLogLine,
  filterLogs,
  formatDuration
} from './training-log-parser';

test('formatDuration formats seconds properly into human readable strings', () => {
  assert.equal(formatDuration(45), '0m 45s');
  assert.equal(formatDuration(125), '2m 5s');
  assert.equal(formatDuration(3665), '1h 1m 5s');
});

test('parseLogLine correctly identifies epoch, loss, onnx, and audio sample lines', () => {
  const epochLine = '[EPOCH 40/200] Loss: 0.0093 | Mel: 0.0064 | SLM: 0.0028';
  const parsedEpoch = parseLogLine(epochLine, 1);
  assert.equal(parsedEpoch.level, 'epoch');
  assert.equal(parsedEpoch.epoch, 40);
  assert.equal(parsedEpoch.loss, 0.0093);
  assert.equal(parsedEpoch.melLoss, 0.0064);
  assert.equal(parsedEpoch.slmLoss, 0.0028);

  const onnxLine = '-> Exported CPU ONNX: exports/kokoro_h200_epoch_40.onnx';
  const parsedOnnx = parseLogLine(onnxLine, 2);
  assert.equal(parsedOnnx.level, 'export');

  const audioLine = '-> Generated 5 audio audit samples in eval_samples/';
  const parsedAudio = parseLogLine(audioLine, 3);
  assert.equal(parsedAudio.level, 'audio');

  const warnLine = 'UserWarning: dropout option adds dropout after all but last recurrent layer';
  const parsedWarn = parseLogLine(warnLine, 4);
  assert.equal(parsedWarn.level, 'warn');
});

test('filterLogs filters by category and search substring', () => {
  const logs = [
    parseLogLine('[EPOCH 10/200] Loss: 0.0150 | Mel: 0.0100 | SLM: 0.0050', 1),
    parseLogLine('-> Exported CPU ONNX: exports/kokoro_best.onnx', 2),
    parseLogLine('-> Generated 5 audio audit samples in eval_samples/', 3)
  ];

  const onnxOnly = filterLogs(logs, 'export');
  assert.equal(onnxOnly.length, 1);
  assert.equal(onnxOnly[0].level, 'export');

  const searched = filterLogs(logs, 'all', 'audit');
  assert.equal(searched.length, 1);
  assert.ok(searched[0].message.includes('audit'));
});
