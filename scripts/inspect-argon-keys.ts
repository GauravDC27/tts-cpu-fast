import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = `python3 -c "
import json
with open('/home/ubuntu/kokoro_h200_trainer/argon_report.json') as f:
    d = json.load(f)
print('Keys in argon_report:', list(d.keys()))
print('Summary:', json.dumps(d.get('summary', d.get('metrics', d)), indent=2)[:500])
"`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
