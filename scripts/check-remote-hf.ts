import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    python3 -c "import huggingface_hub; print('HF Hub available on VM:', huggingface_hub.__version__)" 2>/dev/null || /home/ubuntu/kokoro_h200_trainer/venv/bin/python -c "import huggingface_hub; print('HF Hub available in trainer venv:', huggingface_hub.__version__)" 2>/dev/null || echo "HF Hub not found on VM"
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
