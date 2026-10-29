import { Client } from 'ssh2';

const conn = new Client();
const host = '103.42.50.74';
const port = 1025;
const username = 'ubuntu';
const password = process.env.VM_PASSWORD || '2Lu7Yh5uN^2p7A';

conn.on('ready', () => {
  const cmd = `
/home/ubuntu/kokoro/bin/python -c "
import torch
print('PyTorch CUDA:', torch.cuda.is_available())
# Check UTMOS model file
import os
utmos_path = '/home/ubuntu/tts_eval_models/mos/utmos22_strong_step7459_v1.pt'
print('UTMOS exists:', os.path.exists(utmos_path), 'size:', os.path.getsize(utmos_path))
"
`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect({ host, port, username, password });
