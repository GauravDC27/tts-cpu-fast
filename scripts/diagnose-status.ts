import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  console.log('=== CONNECTED TO H200 VM ===');
  const cmd = `
    echo "--- [1] ACTIVE PROCESSES ---"
    ps aux | grep -E "python|train|argon|torch" | grep -v grep || echo "No active python training processes found."

    echo "--- [2] NVIDIA-SMI STATUS ---"
    nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw --format=csv,noheader || nvidia-smi

    echo "--- [3] LATEST LOGS (training.log & continuous_training.log) ---"
    if [ -f /home/ubuntu/kokoro_h200_trainer/continuous_training.log ]; then
      echo ">> continuous_training.log (last 30 lines):"
      tail -n 30 /home/ubuntu/kokoro_h200_trainer/continuous_training.log
    fi
    if [ -f /home/ubuntu/kokoro_h200_trainer/training.log ]; then
      echo ">> training.log (last 30 lines):"
      tail -n 30 /home/ubuntu/kokoro_h200_trainer/training.log
    fi

    echo "--- [4] STATUS JSON ---"
    cat /home/ubuntu/kokoro_h200_trainer/status.json 2>/dev/null || echo "status.json not found"

    echo "--- [5] ARGON REPORT ---"
    cat /home/ubuntu/kokoro_h200_trainer/argon_report.json 2>/dev/null || echo "argon_report.json not found"

    echo "--- [6] ARTIFACTS & EXPORTS ---"
    ls -la /home/ubuntu/kokoro_h200_trainer/exports /home/ubuntu/kokoro_h200_trainer/checkpoints 2>/dev/null || ls -la /home/ubuntu/kokoro_h200_trainer
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream
      .on('close', (code: number) => {
        console.log(`\n=== COMMAND COMPLETED (code ${code}) ===`);
        conn.end();
      })
      .on('data', (d: Buffer) => process.stdout.write(d.toString()))
      .stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
  });
}).on('error', (err) => {
  console.error('SSH Connection error:', err);
}).connect({ ...vmConnectConfig(), readyTimeout: 20000 });
