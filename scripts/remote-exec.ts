import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

const config = vmConnectConfig();

console.log(`Connecting to ${config.username}@${config.host}:${config.port}...`);

conn.on('ready', () => {
  console.log('SSH connection established successfully.');
  
  const cmd = 'nvidia-smi && lscpu | grep "Model name\\|CPU(s):" && df -h / && python3 --version';
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number, signal: string) => {
      console.log(`Command closed with code ${code}`);
      conn.end();
    }).on('data', (data: Buffer) => {
      console.log(data.toString());
    }).stderr.on('data', (data: Buffer) => {
      console.error('STDERR:', data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection error:', err);
}).connect({
  ...config,
  readyTimeout: 20000
});
