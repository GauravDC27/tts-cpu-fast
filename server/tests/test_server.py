import asyncio
import io
import json
import wave

import numpy as np
import pytest
from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed, InvalidStatus

from cpu_tts.config import Settings
from cpu_tts.server import CpuTtsServer

TOKEN = "test-token"


class FakeEngine:
    sample_rate = 24000
    label = "fake-kokoro"
    voices = {"af_heart", "bf_emma", "hf_alpha", "ef_dora", "ff_siwis", "if_sara", "pf_dora"}

    def __init__(self, fail: bool = False):
        self.calls = []
        self.fail = fail

    def synthesize(self, text, voice, lang, speed):
        self.calls.append((text, voice, lang, speed))
        if self.fail:
            raise RuntimeError("boom")
        t = np.arange(int(self.sample_rate * 0.15 * len(text.split()))) / self.sample_rate
        return (0.3 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)


def run(scenario, engine=None, **overrides):
    engine = engine or FakeEngine()
    settings = Settings(model_path="unused", voices_path="unused", model_label="fake", tokens=frozenset({TOKEN}),
                        host="127.0.0.1", port=0, threads=1, max_concurrency=2, **overrides)

    async def main():
        async with CpuTtsServer(engine, settings).serve() as server:
            port = server.sockets[0].getsockname()[1]
            return await scenario(f"ws://127.0.0.1:{port}", engine)

    return asyncio.run(main())


async def speak(ws, **msg):
    await ws.send(json.dumps({"type": "speak", **msg}))
    metas, payloads = [], []
    while True:
        frame = await ws.recv()
        if isinstance(frame, bytes):
            payloads.append(frame)
            continue
        reply = json.loads(frame)
        if reply["type"] != "meta":
            return metas, payloads, reply
        metas.append(reply)


def url(base, query=f"token={TOKEN}"):
    return f"{base}/ws/cpu/tts?{query}"


def handshake_status(path, headers=None):
    async def scenario(base, _):
        with pytest.raises(InvalidStatus) as err:
            async with connect(base + path, additional_headers=headers):
                pass
        return err.value.response.status_code
    return run(scenario)


def test_missing_or_wrong_token_is_refused_with_401():
    assert handshake_status("/ws/cpu/tts") == 401
    assert handshake_status("/ws/cpu/tts?token=nope") == 401
    assert handshake_status("/ws/cpu/tts", {"Authorization": "Bearer nope"}) == 401


def test_unknown_path_is_404_and_bad_query_speed_is_400():
    assert handshake_status(f"/ws/tts?token={TOKEN}") == 404
    assert handshake_status(f"/ws/cpu/tts?token={TOKEN}&speed=3") == 400


@pytest.mark.parametrize("query, headers", [
    (f"token={TOKEN}", None),
    ("", {"X-Voice-Token": TOKEN}),
    ("", {"Authorization": f"Bearer {TOKEN}"}),
])
def test_all_three_token_forms_are_accepted(query, headers):
    async def scenario(base, _):
        async with connect(url(base, query), additional_headers=headers) as ws:
            return (await speak(ws, text="Hello there."))[2]
    assert run(scenario)["type"] == "done"


def test_healthz_reports_the_model():
    async def scenario(base, _):
        reader, writer = await asyncio.open_connection(*base.removeprefix("ws://").split(":"))
        writer.write(b"GET /healthz HTTP/1.1\r\nHost: x\r\n\r\n")
        response = await reader.read(1024)
        writer.close()
        return response
    response = run(scenario)
    assert response.startswith(b"HTTP/1.1 200") and b"ok fake-kokoro" in response


def test_default_reply_streams_100_ms_wav_frames_then_done():
    async def scenario(base, _):
        async with connect(url(base)) as ws:
            return await speak(ws, text="Hello there, this is a test.")
    metas, payloads, done = run(scenario)

    assert len(metas) == len(payloads) > 1
    assert [m["seg"] for m in metas] == list(range(1, len(metas) + 1))
    assert all(m["bytes"] == len(p) and m["format"] == "wav" and m["sample_rate"] == 24000
               for m, p in zip(metas, payloads))
    assert "ttfa_ms" in metas[0] and all("ttfa_ms" not in m for m in metas[1:])
    assert len(payloads[0]) == 4844
    with wave.open(io.BytesIO(payloads[0])) as w:
        assert (w.getnchannels(), w.getsampwidth(), w.getframerate()) == (1, 2, 24000)
    assert done["type"] == "done" and done["segments"] == len(metas) and done["model"] == "fake-kokoro"
    assert done["audio_sec"] == pytest.approx(sum(m["audio_sec"] for m in metas), abs=0.01)
    assert done["request_id"] and done["tts_ms"] >= metas[-1]["t_ms"]


@pytest.mark.parametrize("msg, fmt, frame_bytes", [
    ({"tts_encoding": "linear16", "tts_sample_rate": 8000}, "linear16", 1600),
    ({"tts_sample_rate": 8000}, "linear16", 1600),
    ({"tts_encoding": "mulaw", "tts_sample_rate": 8000}, "mulaw", 800),
    ({"tts_encoding": "linear16"}, "linear16", 4800),
])
def test_telephony_encodings_are_headerless(msg, fmt, frame_bytes):
    async def scenario(base, _):
        async with connect(url(base)) as ws:
            return await speak(ws, text="Hello there, this is a test.", **msg)
    metas, payloads, done = run(scenario)
    assert done["type"] == "done"
    assert all(m["format"] == fmt for m in metas)
    assert len(payloads[0]) == frame_bytes and not payloads[0].startswith(b"RIFF")


def test_bad_requests_get_error_frames_and_the_socket_stays_open():
    bad = [
        {},
        {"text": "x" * 2001},
        {"text": "Hi.", "voice": "nobody"},
        {"text": "Hi.", "speed": 3},
        {"text": "Hi.", "engine": "gpu"},
        {"text": "Hi.", "tts_encoding": "mp3"},
        {"text": "Hi.", "tts_sample_rate": 16000.0},
        {"text": "Hi.", "language": "ja"},
    ]

    async def scenario(base, _):
        async with connect(url(base)) as ws:
            errors = [(await speak(ws, **msg))[2] for msg in bad]
            await ws.send(json.dumps({"type": "ping"}))
            errors.append(json.loads(await ws.recv()))
            return errors, (await speak(ws, text="Still here."))[2]
    errors, after = run(scenario)
    assert all(e["type"] == "error" and e["detail"] for e in errors)
    assert after["type"] == "done"


def test_compat_engine_names_are_accepted():
    async def scenario(base, _):
        async with connect(url(base)) as ws:
            return [(await speak(ws, text="Hi.", engine=e))[2]["type"] for e in ["ensemble", "gupshup_v2"]]
    assert run(scenario) == ["done", "done"]


@pytest.mark.parametrize("frame, code", [("not json", 1007), ("[1, 2]", 1007), (b"\x00\x01", 1003)])
def test_malformed_or_binary_frames_close_the_socket(frame, code):
    async def scenario(base, _):
        async with connect(url(base)) as ws:
            await ws.send(frame)
            with pytest.raises(ConnectionClosed) as closed:
                await ws.recv()
            return closed.value.rcvd.code
    assert run(scenario) == code


def test_query_speed_is_the_socket_default_and_speak_overrides_it():
    async def scenario(base, engine):
        async with connect(url(base, f"token={TOKEN}&speed=1.5")) as ws:
            await speak(ws, text="One.")
            await speak(ws, text="Two.", speed=0.8)
        return [call[3] for call in engine.calls]
    assert run(scenario) == [1.5, 0.8]


def test_text_is_split_into_sentences_and_speaks_run_in_order():
    async def scenario(base, engine):
        async with connect(url(base)) as ws:
            first = await speak(ws, text="First one. Second one!\nThird one?")
            second = await speak(ws, text="Next reply.")
        return engine.calls, first[2], second[2]
    calls, first, second = run(scenario)
    assert [c[0] for c in calls] == ["First one.", "Second one!", "Third one?", "Next reply."]
    assert first["type"] == second["type"] == "done"


@pytest.mark.parametrize("msg, voice, lang", [
    ({"text": "Hello."}, "af_heart", "en-us"),
    ({"text": "नमस्ते, कैसे हैं आप?"}, "hf_alpha", "hi"),
    ({"text": "Hello.", "voice": "bf_emma"}, "bf_emma", "en-gb"),
    ({"text": "Bonjour.", "language": "fr"}, "ff_siwis", "fr-fr"),
    ({"text": "Namaste.", "voice": "hf_alpha", "language": "en"}, "hf_alpha", "en-us"),
])
def test_voice_and_language_resolution(msg, voice, lang):
    async def scenario(base, engine):
        async with connect(url(base)) as ws:
            await speak(ws, **msg)
        return engine.calls[0][1:3]
    assert run(scenario) == (voice, lang)


def test_synthesis_failure_sends_error_without_done_and_keeps_the_socket():
    async def scenario(base, _):
        async with connect(url(base)) as ws:
            first = await speak(ws, text="Hello.")
            second = await speak(ws, text="Again.")
        return first, second
    (metas, payloads, error), (_, _, again) = run(scenario, engine=FakeEngine(fail=True))
    assert metas == [] and payloads == [] and error["type"] == "error" and "boom" in error["detail"]
    assert again["type"] == "error"


def test_idle_socket_is_closed():
    async def scenario(base, _):
        async with connect(url(base)) as ws:
            with pytest.raises(ConnectionClosed) as closed:
                await ws.recv()
            return closed.value.rcvd.code
    assert run(scenario, idle_timeout_s=0.2) == 1000
