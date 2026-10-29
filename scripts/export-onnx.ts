import { Client } from 'ssh2';
import { vmConnectConfig } from './lib/vm-connection';

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
cd /home/ubuntu/kokoro_h200_trainer
/home/ubuntu/kokoro/bin/python -c "
import sys
sys.path.insert(0, '/home/ubuntu/kokoro_h200_trainer')
import torch
from train_kokoro_h200 import KokoroAcousticAdapter

device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
model = KokoroAcousticAdapter().to(device)
state = torch.load('/home/ubuntu/kokoro_h200_trainer/checkpoints/best_model.pth', map_location=device)
model.load_state_dict(state)
model.eval()

dummy_tokens = torch.randint(1, 100, (1, 32)).to(device)
dummy_style = torch.randn(1, 128).to(device)
onnx_path = '/home/ubuntu/kokoro_h200_trainer/exports/kokoro_h200_best.onnx'

with torch.no_grad():
    torch.onnx.export(
        model,
        (dummy_tokens, dummy_style),
        onnx_path,
        input_names=['tokens', 'style_vector'],
        output_names=['mel', 'duration', 'slm_score'],
        dynamic_axes={'tokens': {1: 'seq_len'}},
        opset_version=17
    )
print('SUCCESSFULLY_EXPORTED_ONNX:', onnx_path)
"
ls -lh /home/ubuntu/kokoro_h200_trainer/exports
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => console.log(d.toString()))
      .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect(vmConnectConfig());
