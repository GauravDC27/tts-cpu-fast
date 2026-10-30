import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

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
}).connect(vmConnectConfig());
