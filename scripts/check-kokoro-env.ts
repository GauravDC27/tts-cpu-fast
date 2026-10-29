import { Client } from 'ssh2';

const conn = new Client();
const host = '103.42.50.74';
const port = 1025;
const username = 'ubuntu';
const password = process.env.VM_PASSWORD || '2Lu7Yh5uN^2p7A';

conn.on('ready', () => {
  const cmd = '/home/ubuntu/kokoro/bin/python -c "import torch; print(\'PyTorch:\', torch.__version__, \'CUDA available:\', torch.cuda.is_available(), \'Device count:\', torch.cuda.device_count()); print(\'Device name:\', torch.cuda.get_device_name(0) if torch.cuda.is_available() else \'None\')" && /home/ubuntu/kokoro/bin/pip list';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect({ host, port, username, password });
