import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = '/home/ubuntu/kokoro/bin/python -c "import torch; print(\'PyTorch:\', torch.__version__, \'CUDA available:\', torch.cuda.is_available(), \'Device count:\', torch.cuda.device_count()); print(\'Device name:\', torch.cuda.get_device_name(0) if torch.cuda.is_available() else \'None\')" && /home/ubuntu/kokoro/bin/pip list';
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
