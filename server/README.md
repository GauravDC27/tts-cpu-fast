# /ws/cpu/tts: CPU text-to-speech streaming server

A WebSocket service that turns text into streamed speech on CPU with
[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) v1.0 through ONNX Runtime.
It speaks the same protocol as `/ws/tts` in the Gupshup Voice AI integration guide
(`speak` → `meta` + binary audio pairs → `done`), so a client switches by changing the URL.

## Which model it serves

Kokoro-82M v1.0 (ONNX, fp32 by default, int8 optional), the base model of this project.
`done.model` and `GET /healthz` report the model label, and the startup log prints the model file's sha256.

The model produced by the H200 trainer in `scripts/` (`best_model.pth` /
`kokoro_argon_gold_certified.onnx`) cannot be served: it is a 2M-parameter
`KokoroAcousticAdapter` that outputs a mel spectrogram (`mel`, `duration`,
`slm_score`) with no vocoder, so it produces no audio. The server checks the
graph at startup and refuses any ONNX that does not map `tokens`, `style`,
`speed` to a waveform. A real fine-tuned Kokoro checkpoint, exported in the
Kokoro v1.0 ONNX format, can be served by pointing `CPU_TTS_MODEL_PATH` at it.

## Run it

Python 3.10+.

```bash
cd server
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
scripts/download_models.sh          # ~450 MB into server/models/, sha256-checked
VOICE_TOKENS="<token>" python -m cpu_tts
```

Then speak a line and save it:

```bash
VOICE_TOKEN="<token>" python examples/client.py "Hello there." hello.wav ws://localhost:8080
```

## Configuration

All settings come from the environment.

| Variable | Default | Notes |
|---|---|---|
| `VOICE_TOKENS` | (required) | Comma-separated access tokens. The server will not start without at least one |
| `VOICE_TOKENS_FILE` | | File with one token per line, added to `VOICE_TOKENS` |
| `CPU_TTS_MODEL_PATH` | `models/kokoro-v1.0.onnx` | `models/kokoro-v1.0.int8.onnx` is about 15% faster for English with slightly lower quality |
| `CPU_TTS_VOICES_PATH` | `models/voices-v1.0.bin` | Kokoro voice pack |
| `CPU_TTS_MODEL_LABEL` | model file name | Reported as `done.model` |
| `CPU_TTS_HOST` / `CPU_TTS_PORT` | `0.0.0.0` / `8080` | |
| `CPU_TTS_THREADS` | `min(4, cores)` | ONNX Runtime threads per synthesis |
| `CPU_TTS_MAX_CONCURRENCY` | `cores / threads` | Syntheses that run at once; others wait their turn |

Fixed behaviour, as in `/ws/tts`: WebSocket pings every 20 s, sockets idle for
1 hour are closed, the largest message is 16 MiB.

## Protocol

Same as `/ws/tts`; the integration guide has the full description. In short:

- Authenticate with `?token=`, `X-Voice-Token` or `Authorization: Bearer`. A missing or wrong token gets HTTP 401 at the handshake.
- Send `{"type": "speak", "text": "..."}` with optional `voice`, `language`, `speed`, `tts_encoding` (`wav`, `linear16`, `mulaw`), `tts_sample_rate` and `engine`.
- Receive `meta` + binary frames of about 100 ms, then `done` (`segments`, `tts_ms`, `audio_sec`, plus `model` and `request_id`).
- Bad requests get `{"type": "error", "detail": ...}` and the socket stays open. Malformed JSON or binary frames close the socket.
- Text is split into sentences; the next sentence is synthesized while the current one streams.

Voices: the Kokoro voices for English (US `a*`, UK `b*`), Hindi (`h*`),
Spanish (`e*`), French (`f*`), Italian (`i*`) and Portuguese (`p*`).
Defaults per language: `af_heart`, `bf_emma`, `hf_alpha`, `ef_dora`, `ff_siwis`, `if_sara`, `pf_dora`.
With no `voice` or `language`, Devanagari text is spoken in Hindi and anything else in US English.
Hindi sounds right only in Devanagari; romanized Hindi is read with English pronunciation.

## Serving it at /ws/cpu/tts on the existing host

Run the server next to the existing voice gateway and route the path to it, for example with nginx:

```nginx
location /ws/cpu/tts {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3700s;
    proxy_send_timeout 3700s;
}
```

## Measured performance

Measured over the WebSocket on a 4-vCPU Intel Xeon (2.1 GHz, AVX-512) with the fp32 model,
4 ONNX Runtime threads, median of 3 runs:

| Request | Audio | First audio | Whole reply | Real-time factor |
|---|---|---|---|---|
| English, one short sentence | 1.9 s | 0.7-0.9 s | 0.7-0.9 s | 0.38-0.50 |
| English, three sentences | 4.8 s | 0.5 s | 2.0 s | 0.41 |
| Hindi (Devanagari), one sentence | 3.2 s | 1.4 s | 1.4 s | 0.43 |

First audio arrives once the first sentence is synthesized, so short opening sentences start sooner.
Four simultaneous calls on the same 4 vCPUs took a median of 1.9 s to first audio, so size the
machine for the expected concurrent calls. More cores lower these numbers; they have not been measured here.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```

The protocol tests use a fake engine and need no model. Two tests run real Kokoro
synthesis when the weights are in `server/models/` (or at `CPU_TTS_MODEL_PATH` / `CPU_TTS_VOICES_PATH`)
and are skipped otherwise.
