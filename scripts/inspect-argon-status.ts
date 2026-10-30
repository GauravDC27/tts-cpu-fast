import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
    echo "--- STATUS.JSON ---"
    cat /home/ubuntu/kokoro_h200_trainer/status.json 2>/dev/null
    echo "--- ARGON_REPORT SUMMARY ---"
    python3 -c "
import json
with open('/home/ubuntu/kokoro_h200_trainer/argon_report.json') as f:
    d = json.load(f)
print('Decision:', d.get('overallDecision'))
print('Final Metrics:', json.dumps(d.get('finalMetrics'), indent=2))
print('Total Iterations:', len(d.get('iterations', [])))
" 2>/dev/null || echo "Could not parse argon report with python"
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
