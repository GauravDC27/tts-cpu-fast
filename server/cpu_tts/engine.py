"""Kokoro-82M synthesis on CPU through ONNX Runtime."""

import hashlib
import threading
from pathlib import Path

import espeakng_loader
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro

from .voices import servable_voices

SAMPLE_RATE = 24000
# espeak-ng copies its data path into a 160-byte buffer. A longer path is silently swapped
# for the build machine's path, and espeak then exits the whole process on first use.
ESPEAK_MAX_DATA_PATH = 159


class ModelNotServable(RuntimeError):
    pass


class InstallPathTooLong(RuntimeError):
    pass


def check_espeak_data_path(path: str) -> None:
    resolved = str(Path(path).resolve())
    if len(resolved) > ESPEAK_MAX_DATA_PATH:
        raise InstallPathTooLong(
            f"espeak-ng cannot use its data at {resolved} ({len(resolved)} characters; the limit is "
            f"{ESPEAK_MAX_DATA_PATH}). Install the server's virtualenv at a shorter path."
        )


def check_servable(session: ort.InferenceSession) -> None:
    """Refuse any ONNX graph that does not map (tokens, style, speed) to a waveform."""
    inputs = {i.name for i in session.get_inputs()}
    outputs = [o.name for o in session.get_outputs()]
    if {"tokens", "style", "speed"} <= inputs and len(outputs) == 1:
        return
    if "mel" in outputs:
        raise ModelNotServable(
            f"This ONNX outputs {outputs} (a mel spectrogram, no waveform). It is the "
            "KokoroAcousticAdapter from the H200 trainer, which cannot produce audio. "
            "Serve a Kokoro-82M ONNX (inputs tokens, style, speed -> audio) instead."
        )
    raise ModelNotServable(
        f"Expected a Kokoro-82M ONNX with inputs tokens, style, speed and one audio output; "
        f"got inputs {sorted(inputs)} and outputs {outputs}."
    )


def file_sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


class KokoroEngine:
    sample_rate = SAMPLE_RATE

    def __init__(self, model_path: str, voices_path: str, label: str, threads: int):
        check_espeak_data_path(espeakng_loader.get_data_path())
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        session = ort.InferenceSession(model_path, options, providers=["CPUExecutionProvider"])
        check_servable(session)
        self._kokoro = Kokoro.from_session(session, voices_path)
        # espeak keeps global state, so phonemization is serialized; inference runs in parallel
        self._phonemize_lock = threading.Lock()
        self.voices = servable_voices(set(self._kokoro.get_voices()))
        self.label = label
        self.model_sha256 = file_sha256(model_path)
        # Fail at startup rather than on a caller's first request, and warm the session
        self.synthesize("Ready.", "af_heart", "en-us", 1.0)

    def synthesize(self, text: str, voice: str, lang: str, speed: float) -> np.ndarray:
        with self._phonemize_lock:
            phonemes = self._kokoro.tokenizer.phonemize(text, lang)
        audio, _ = self._kokoro.create(phonemes, voice=voice, speed=speed, lang=lang, is_phonemes=True)
        return audio
