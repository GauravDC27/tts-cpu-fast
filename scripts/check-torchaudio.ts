import { Client } from 'ssh2';

const conn = new Client();
const host = '103.42.50.74';
const port = 1025;
const username = 'ubuntu';
const password = process.env.VM_PASSWORD || '2Lu7Yh5uN^2p7A';

conn.on('ready', () => {
  const cmd = '/home/ubuntu/kokoro/bin/python -c "import torchaudio; print(\'torchaudio:\', torchaudio.__version__)" 2>&1; /home/ubuntu/kokoro/bin/python -c "import onnx; print(\'onnx:\', onnx.__version__)" 2>&1';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect({ host, port, username, password });
