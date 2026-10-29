"""Speak one line over /ws/cpu/tts and save it as a WAV file.

    VOICE_TOKEN=... python examples/client.py "Hello there." out.wav [ws://localhost:8080]
"""

import asyncio
import json
import os
import sys
import wave
from urllib.parse import quote

from websockets.asyncio.client import connect


async def main(text: str, out_path: str, base: str) -> None:
    url = f"{base}/ws/cpu/tts?token={quote(os.environ['VOICE_TOKEN'])}"
    async with connect(url) as ws:
        await ws.send(json.dumps({"type": "speak", "text": text,
                                  "tts_encoding": "linear16", "tts_sample_rate": 24000}))
        pcm = b""
        while True:
            frame = await ws.recv()
            if isinstance(frame, bytes):
                pcm += frame
                continue
            msg = json.loads(frame)
            if msg["type"] == "meta" and "ttfa_ms" in msg:
                print(f"first audio after {msg['ttfa_ms']} ms")
            elif msg["type"] == "done":
                print(f"done: {msg['audio_sec']} s of audio in {msg['tts_ms']} ms, model {msg['model']}")
                break
            elif msg["type"] == "error":
                sys.exit(f"error: {msg['detail']}")

    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(pcm)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "ws://localhost:8080"))
