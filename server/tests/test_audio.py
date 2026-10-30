import io
import wave

import numpy as np

from cpu_tts.audio import encode_frames, mulaw_encode, resample, wav_file


def mulaw_decode(codes: np.ndarray) -> np.ndarray:
    u = ~codes.astype(np.int32) & 0xFF
    sign, exponent, mantissa = u & 0x80, (u >> 4) & 0x07, u & 0x0F
    magnitude = (((mantissa << 3) + 0x84) << exponent) - 0x84
    return np.where(sign, -magnitude, magnitude)


def test_mulaw_matches_g711_reference_codes():
    codes = mulaw_encode(np.array([0, 32767, -32768, -1], dtype=np.int16))
    assert codes.tolist() == [0xFF, 0x80, 0x00, 0x7F]


def test_mulaw_round_trip_stays_within_quantization_error():
    pcm = (np.sin(np.linspace(0, 20, 4000)) * 20000).astype(np.int16)
    decoded = mulaw_decode(mulaw_encode(pcm))
    assert np.max(np.abs(decoded - pcm) / (np.abs(pcm) + 64)) < 0.07


def test_wav_file_is_a_valid_16_bit_mono_wav():
    pcm = (np.arange(2400) % 100 * 100).astype("<i2")
    with wave.open(io.BytesIO(wav_file(pcm, 24000))) as w:
        assert (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()) == (1, 2, 24000, 2400)


def test_default_frames_are_100_ms_wav_files_of_4844_bytes():
    frames = encode_frames(np.zeros(int(24000 * 1.05), np.float32), 24000, "wav", 24000)
    assert len(frames) == 11
    assert all(len(payload) == 4844 and seconds == 0.1 for payload, seconds in frames[:-1])
    assert frames[-1][1] == 0.05


def test_telephony_frames_are_headerless_at_the_requested_rate():
    audio = np.zeros(24000, np.float32)
    linear16 = encode_frames(audio, 24000, "linear16", 8000)
    mulaw = encode_frames(audio, 24000, "mulaw", 8000)
    assert [len(p) for p, _ in linear16] == [1600] * 10
    assert [len(p) for p, _ in mulaw] == [800] * 10
    assert not linear16[0][0].startswith(b"RIFF")


def test_resample_keeps_duration():
    assert len(resample(np.zeros(24000, np.float32), 24000, 8000)) == 8000
