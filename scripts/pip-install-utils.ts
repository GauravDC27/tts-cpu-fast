import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

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
}).connect(vmConnectConfig());
