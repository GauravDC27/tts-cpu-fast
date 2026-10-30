import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = '/home/ubuntu/kokoro/bin/python -c "import torchaudio; print(\'torchaudio:\', torchaudio.__version__)" 2>&1; /home/ubuntu/kokoro/bin/python -c "import onnx; print(\'onnx:\', onnx.__version__)" 2>&1';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
