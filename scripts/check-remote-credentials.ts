import { Client } from 'ssh2';

const conn = new Client();
const host = '103.42.50.74';
const port = 1025;
const username = 'ubuntu';
const password = process.env.VM_PASSWORD || '2Lu7Yh5uN^2p7A';

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
}).connect({ host, port, username, password });
