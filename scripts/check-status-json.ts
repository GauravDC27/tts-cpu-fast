import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = 'ps -ef | grep train_kokoro_h200.py | grep -v grep; cat /home/ubuntu/kokoro_h200_trainer/training.log | tail -n 25; cat /home/ubuntu/kokoro_h200_trainer/training_state.json 2>/dev/null';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
