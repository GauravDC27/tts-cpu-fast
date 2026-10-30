import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = 'ls -lh /home/ubuntu/kokoro_h200_trainer/checkpoints && ls -lh /home/ubuntu/kokoro_h200_trainer/exports && ls -lh /home/ubuntu/kokoro_h200_trainer/eval_samples';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
