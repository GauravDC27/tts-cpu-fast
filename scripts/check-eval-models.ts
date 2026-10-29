import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = 'ls -la /home/ubuntu/tts_eval_models && ls -la /home/ubuntu/tts_eval_models/mos';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
