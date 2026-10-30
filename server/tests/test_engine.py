import asyncio
import json
import os

import numpy as np
import onnxruntime as ort
import pytest
from onnx import TensorProto, helper

from cpu_tts.config import ConfigError, Settings
from cpu_tts.engine import (ESPEAK_MAX_DATA_PATH, InstallPathTooLong, KokoroEngine, ModelNotServable,
                            check_espeak_data_path, check_servable)

MODEL = os.environ.get("CPU_TTS_MODEL_PATH", "models/kokoro-v1.0.onnx")
VOICES = os.environ.get("CPU_TTS_VOICES_PATH", "models/voices-v1.0.bin")
needs_model = pytest.mark.skipif(not (os.path.exists(MODEL) and os.path.exists(VOICES)),
                                 reason="Kokoro weights not present; run scripts/download_models.sh")


def session_for(inputs, outputs):
    """A tiny graph with the given I/O names; every output is an Identity of the first input."""
    graph = helper.make_graph(
        [helper.make_node("Identity", [inputs[0][0]], [name]) for name in outputs],
        "g",
        [helper.make_tensor_value_info(name, dtype, None) for name, dtype in inputs],
        [helper.make_tensor_value_info(name, inputs[0][1], None) for name in outputs],
    )
    # Pin the IR version: newer onnx releases default to one onnxruntime cannot load yet
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)], ir_version=10)
    return ort.InferenceSession(model.SerializeToString(), providers=["CPUExecutionProvider"])


def test_the_h200_trained_adapter_onnx_is_refused():
    # Same I/O as scripts/export-onnx.ts: tokens + style_vector -> mel, duration, slm_score
    adapter = session_for([("style_vector", TensorProto.FLOAT), ("tokens", TensorProto.INT64)],
                          ["mel", "duration", "slm_score"])
    with pytest.raises(ModelNotServable, match="mel spectrogram"):
        check_servable(adapter)


def test_a_kokoro_shaped_onnx_is_accepted():
    kokoro = session_for([("speed", TensorProto.FLOAT), ("tokens", TensorProto.INT64),
                          ("style", TensorProto.FLOAT)], ["audio"])
    check_servable(kokoro)


def test_espeak_data_paths_longer_than_its_buffer_are_refused(tmp_path):
    base = tmp_path.resolve()
    fits = base / ("d" * (ESPEAK_MAX_DATA_PATH - len(str(base)) - 1))
    too_long = base / ("d" * (ESPEAK_MAX_DATA_PATH - len(str(base))))
    check_espeak_data_path(str(fits))
    with pytest.raises(InstallPathTooLong, match="shorter path"):
        check_espeak_data_path(str(too_long))


def test_settings_fail_closed_without_tokens():
    with pytest.raises(ConfigError):
        Settings.from_env({})
    settings = Settings.from_env({"VOICE_TOKENS": " a, b ,", "CPU_TTS_MODEL_PATH": "m/kokoro-v1.0.int8.onnx"})
    assert settings.tokens == {"a", "b"} and settings.model_label == "kokoro-v1.0.int8"


@needs_model
def test_real_kokoro_speaks_english_and_hindi():
    engine = KokoroEngine(MODEL, VOICES, "kokoro-v1.0", threads=2)
    for text, voice, lang in [("The birch canoe slid on the smooth planks.", "af_heart", "en-us"),
                              ("नमस्ते, मैं आपकी कैसे मदद कर सकती हूँ?", "hf_alpha", "hi")]:
        audio = engine.synthesize(text, voice, lang, 1.0)
        assert len(audio) / engine.sample_rate > 1.0
        assert np.abs(audio).max() > 0.1


@needs_model
def test_real_kokoro_streams_over_the_socket():
    from websockets.asyncio.client import connect
    from cpu_tts.server import CpuTtsServer

    engine = KokoroEngine(MODEL, VOICES, "kokoro-v1.0", threads=2)
    settings = Settings(model_path=MODEL, voices_path=VOICES, model_label="kokoro-v1.0", tokens=frozenset({"t"}),
                        host="127.0.0.1", port=0, threads=2, max_concurrency=1)

    async def main():
        async with CpuTtsServer(engine, settings).serve() as server:
            port = server.sockets[0].getsockname()[1]
            async with connect(f"ws://127.0.0.1:{port}/ws/cpu/tts?token=t") as ws:
                await ws.send(json.dumps({"type": "speak", "text": "Hello there. Your order ships tomorrow.",
                                          "tts_encoding": "linear16", "tts_sample_rate": 8000}))
                metas, audio = [], b""
                while True:
                    frame = await ws.recv()
                    if isinstance(frame, bytes):
                        audio += frame
                    elif (msg := json.loads(frame))["type"] == "meta":
                        metas.append(msg)
                    else:
                        return metas, audio, msg

    metas, audio, done = asyncio.run(main())
    assert done["type"] == "done" and done["model"] == "kokoro-v1.0"
    assert len(audio) == sum(m["bytes"] for m in metas)
    assert done["audio_sec"] > 1.5 and metas[0]["ttfa_ms"] < done["tts_ms"]
