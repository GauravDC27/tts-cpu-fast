/**
 * Utilities for parsing, formatting, and filtering H200 Kokoro training logs and telemetry.
 */

export interface TrainingLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'epoch' | 'loss' | 'export' | 'audio' | 'warn';
  message: string;
  epoch?: number;
  loss?: number;
  melLoss?: number;
  slmLoss?: number;
}

export interface TrainingMetricsSnapshot {
  status: 'AUTONOMOUS_RUNNING' | 'EVALUATING' | 'EXPORTING_ONNX' | 'COMPLETED';
  epoch: number;
  totalEpochs: number;
  step: number;
  totalSteps: number;
  lossTotal: number;
  lossMel: number;
  lossDuration: number;
  lossSlmDiscriminator: number;
  learningRate: number;
  predictedWerPercent: number;
  naturalnessMOS: number;
  gpuVramUsedMb: number;
  gpuVramTotalMb: number;
  gpuTempC: number;
  elapsedSeconds: number;
  pid: number;
  activeNode: string;
  checkpointsSaved: number;
  onnxExportsSaved: number;
  evalAudiosGenerated: number;
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export function parseLogLine(rawLine: string, index: number = 0): TrainingLogEntry {
  const id = `log-${index}-${Date.now()}`;
  const now = new Date().toLocaleTimeString();

  if (rawLine.includes('Exported') || rawLine.includes('ONNX')) {
    return {
      id,
      timestamp: now,
      level: 'export',
      message: rawLine
    };
  }

  if (rawLine.includes('Generated') || rawLine.includes('eval_samples') || rawLine.includes('.wav')) {
    return {
      id,
      timestamp: now,
      level: 'audio',
      message: rawLine
    };
  }

  if (rawLine.includes('[EPOCH')) {
    const epochMatch = rawLine.match(/\[EPOCH\s+(\d+)\/(\d+)\]/);
    const lossMatch = rawLine.match(/Loss:\s+([\d.]+)/);
    const melMatch = rawLine.match(/Mel:\s+([\d.]+)/);
    const slmMatch = rawLine.match(/SLM:\s+([\d.]+)/);

    return {
      id,
      timestamp: now,
      level: 'epoch',
      message: rawLine,
      epoch: epochMatch ? parseInt(epochMatch[1], 10) : undefined,
      loss: lossMatch ? parseFloat(lossMatch[1]) : undefined,
      melLoss: melMatch ? parseFloat(melMatch[1]) : undefined,
      slmLoss: slmMatch ? parseFloat(slmMatch[1]) : undefined
    };
  }

  if (rawLine.includes('WARN') || rawLine.includes('Warning')) {
    return {
      id,
      timestamp: now,
      level: 'warn',
      message: rawLine
    };
  }

  if (rawLine.includes('Loss:') || rawLine.includes('mel:')) {
    return {
      id,
      timestamp: now,
      level: 'loss',
      message: rawLine
    };
  }

  return {
    id,
    timestamp: now,
    level: 'info',
    message: rawLine
  };
}

export function filterLogs(
  logs: TrainingLogEntry[],
  filterLevel: string,
  searchQuery: string = ''
): TrainingLogEntry[] {
  return logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) {
      return false;
    }
    if (searchQuery.trim()) {
      return log.message.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });
}
