import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    echo "=== 1. PROCESS STATUS ==="
    ps aux | grep -E "continuous_train|train|argon" | grep -v grep || echo "No active training processes"

    echo "=== 2. NVIDIA-SMI ==="
    nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu,power.draw --format=csv

    echo "=== 3. STATUS.JSON ==="
    cat /home/ubuntu/kokoro_h200_trainer/status.json 2>/dev/null | head -n 40 || echo "No status.json"

    echo "=== 4. LATEST 15 LINES OF CONTINUOUS TRAINING LOG ==="
    tail -n 15 /home/ubuntu/kokoro_h200_trainer/continuous_training.log 2>/dev/null || echo "No continuous_training.log"
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
