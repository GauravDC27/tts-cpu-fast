"""Resampling and wire encodings for streamed audio frames."""

import struct

import numpy as np
import soxr

FRAME_SEC = 0.1
FORMATS = ("wav", "linear16", "mulaw")


def resample(audio: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    if src_rate == dst_rate:
        return audio
    return soxr.resample(audio, src_rate, dst_rate, quality="HQ").astype(np.float32)


def to_pcm16(audio: np.ndarray) -> np.ndarray:
    return (np.clip(audio, -1.0, 1.0) * 32767.0).round().astype("<i2")


def mulaw_encode(pcm16: np.ndarray) -> np.ndarray:
    """G.711 mu-law, as used by telephony (8-bit, sign/exponent/mantissa, inverted)."""
    x = pcm16.astype(np.int32)
    sign = (x < 0).astype(np.int32) << 7
    magnitude = np.minimum(np.abs(x), 32635) + 0x84
    exponent = np.clip(np.floor(np.log2(magnitude)).astype(np.int32) - 7, 0, 7)
    mantissa = (magnitude >> (exponent + 3)) & 0x0F
    return (~(sign | (exponent << 4) | mantissa) & 0xFF).astype(np.uint8)


def wav_file(pcm16: np.ndarray, rate: int) -> bytes:
    data = pcm16.tobytes()
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + len(data), b"WAVE",
        b"fmt ", 16, 1, 1, rate, rate * 2, 2, 16,
        b"data", len(data),
    )
    return header + data


def encode_frames(audio: np.ndarray, src_rate: int, fmt: str, rate: int) -> list[tuple[bytes, float]]:
    """Split float audio into ~100 ms frames in the wire format; returns (payload, seconds) pairs."""
    pcm16 = to_pcm16(resample(audio, src_rate, rate))
    step = int(rate * FRAME_SEC)
    frames = []
    for start in range(0, len(pcm16), step):
        chunk = pcm16[start:start + step]
        if fmt == "wav":
            payload = wav_file(chunk, rate)
        elif fmt == "mulaw":
            payload = mulaw_encode(chunk).tobytes()
        else:
            payload = chunk.tobytes()
        frames.append((payload, len(chunk) / rate))
    return frames
