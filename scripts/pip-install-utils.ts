import { Client } from 'ssh2';

const conn = new Client();
const host = '103.42.50.74';
const port = 1025;
const username = 'ubuntu';
const password = process.env.VM_PASSWORD || '2Lu7Yh5uN^2p7A';

conn.on('ready', () => {
  const cmd = '/home/ubuntu/kokoro/bin/pip install --no-cache-dir onnx onnxsim datasets torchaudio';
  console.log('Running pip install on VM...');
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code: number) => {
      console.log(`Pip install finished with code ${code}`);
      conn.end();
    })
    .on('data', (d: Buffer) => console.log(d.toString()))
    .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect({ host, port, username, password });
