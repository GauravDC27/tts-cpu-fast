import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = 'find /home/ubuntu/.cache /home/ubuntu/kokoro -name "*kokoro*" -o -name "*.pth" -o -name "*.bin" -o -name "*.safetensors" 2>/dev/null | head -n 30';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
