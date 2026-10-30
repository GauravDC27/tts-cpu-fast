import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    echo "=== REMOTE GIT CONFIG ==="
    git config --global --list 2>/dev/null || true
    echo "=== REMOTE HF CONFIG ==="
    ls -la ~/.cache/huggingface/token ~/.huggingface 2>/dev/null || true
    if [ -f ~/.cache/huggingface/token ]; then
      echo "HF token exists in ~/.cache/huggingface/token"
    fi
    echo "=== REMOTE GITHUB SSH ==="
    ls -la ~/.ssh 2>/dev/null || true
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
