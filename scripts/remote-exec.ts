import { Client } from 'ssh2';

const conn = new Client();

const host = '103.42.50.74';
const port = 1025;
const username = 'ubuntu';
const password = process.env.VM_PASSWORD || '2Lu7Yh5uN^2p7A';

console.log(`Connecting to ${username}@${host}:${port}...`);

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
  host,
  port,
  username,
  password,
  readyTimeout: 20000
});
