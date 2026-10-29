import { Client } from 'ssh2';

const conn = new Client();
const host = '103.42.50.74';
const port = 1025;
const username = 'ubuntu';
const password = process.env.VM_PASSWORD || '2Lu7Yh5uN^2p7A';

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
}).connect({ host, port, username, password });
