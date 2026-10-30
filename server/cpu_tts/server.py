"""WebSocket server for /ws/cpu/tts, wire-compatible with the /ws/tts protocol."""

import asyncio
import hmac
import json
import logging
import re
import time
import uuid
from dataclasses import dataclass
from http import HTTPStatus
from typing import Protocol
from urllib.parse import parse_qs, urlsplit

import numpy as np
from websockets.asyncio.server import ServerConnection, serve
from websockets.exceptions import ConnectionClosed
from websockets.http11 import Request

from . import WS_PATH
from .audio import FORMATS, encode_frames
from .config import Settings
from .voices import VoiceError, resolve

log = logging.getLogger("cpu_tts")

MAX_TEXT_CHARS = 2000
SENTENCE_PAUSE_SEC = 0.2
# Accepted on /ws/tts for compatibility, so clients can switch URL without changing payloads
COMPAT_ENGINES = {"ensemble", "local", "gupshup", "gupshup_v2"}
SENTENCE_END = re.compile(r"(?<=[.!?।…])\s+|\n+")


class Engine(Protocol):
    sample_rate: int
    voices: set[str]
    label: str

    def synthesize(self, text: str, voice: str, lang: str, speed: float) -> np.ndarray: ...


class SpeakError(ValueError):
    pass


@dataclass(frozen=True)
class Speak:
    text: str
    voice: str
    lang: str
    speed: float
    fmt: str
    rate: int


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in SENTENCE_END.split(text) if s.strip()]


def parse_speed(value, field: str) -> float:
    try:
        speed = float(value)
    except (TypeError, ValueError):
        raise SpeakError(f"{field} must be a number from 0.5 to 2.0")
    if not 0.5 <= speed <= 2.0:
        raise SpeakError(f"{field} must be from 0.5 to 2.0, got {speed}")
    return speed


def parse_speak(msg: dict, default_speed: float, voices: set[str]) -> Speak:
    text = msg.get("text")
    if not isinstance(text, str) or not text.strip():
        raise SpeakError("text is required")
    if len(text) > MAX_TEXT_CHARS:
        raise SpeakError(f"text is {len(text)} characters; the limit is {MAX_TEXT_CHARS}")

    engine = msg.get("engine")
    if engine is not None and engine not in COMPAT_ENGINES:
        raise SpeakError(f"unknown engine {engine!r}; omit it")

    speed = default_speed if msg.get("speed") is None else parse_speed(msg["speed"], "speed")

    encoding, rate = msg.get("tts_encoding"), msg.get("tts_sample_rate")
    if encoding is not None and encoding not in FORMATS:
        raise SpeakError(f"tts_encoding must be one of {list(FORMATS)}")
    if rate is not None and (not isinstance(rate, int) or isinstance(rate, bool) or not 8000 <= rate <= 48000):
        raise SpeakError("tts_sample_rate must be a whole number of Hz from 8000 to 48000")
    # Default: each frame is a small WAV file at 24 kHz. Setting a rate alone switches to raw PCM.
    fmt = encoding or ("linear16" if rate is not None else "wav")

    try:
        voice, lang = resolve(text, msg.get("voice"), msg.get("language"), voices)
    except VoiceError as e:
        raise SpeakError(str(e))
    return Speak(text=text, voice=voice, lang=lang, speed=speed, fmt=fmt, rate=rate or 24000)


def request_token(query: dict[str, list[str]], headers) -> str | None:
    if query.get("token"):
        return query["token"][0]
    if headers.get("X-Voice-Token"):
        return headers["X-Voice-Token"]
    auth = headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


class CpuTtsServer:
    def __init__(self, engine: Engine, settings: Settings):
        self.engine = engine
        self.settings = settings
        self._synth_slots = asyncio.Semaphore(settings.max_concurrency)

    def _authorized(self, token: str | None) -> bool:
        if not token:
            return False
        # Compare against every token so the time taken does not reveal a partial match
        matches = [hmac.compare_digest(token.encode(), t.encode()) for t in self.settings.tokens]
        return any(matches)

    def process_request(self, connection: ServerConnection, request: Request):
        url = urlsplit(request.path)
        if url.path == "/healthz":
            return connection.respond(HTTPStatus.OK, f"ok {self.engine.label}\n")
        if url.path != WS_PATH:
            return connection.respond(HTTPStatus.NOT_FOUND, "Not Found\n")
        query = parse_qs(url.query)
        if not self._authorized(request_token(query, request.headers)):
            return connection.respond(HTTPStatus.UNAUTHORIZED, "Unauthorized\n")
        if "speed" in query:
            try:
                parse_speed(query["speed"][0], "speed")
            except SpeakError as e:
                return connection.respond(HTTPStatus.BAD_REQUEST, f"{e}\n")
        return None

    async def handler(self, ws: ServerConnection) -> None:
        query = parse_qs(urlsplit(ws.request.path).query)
        default_speed = float(query["speed"][0]) if "speed" in query else 1.0
        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), self.settings.idle_timeout_s)
            except asyncio.TimeoutError:
                await ws.close(1000, "idle timeout")
                return
            except ConnectionClosed:
                return

            if isinstance(raw, bytes):
                await ws.close(1003, "binary frames are not accepted")
                return
            try:
                msg = json.loads(raw)
            except ValueError:
                msg = None
            if not isinstance(msg, dict):
                await ws.close(1007, "frames must be JSON objects")
                return

            if msg.get("type") != "speak":
                await self._send_error(ws, f"unknown message type {msg.get('type')!r}; send speak")
                continue
            try:
                speak = parse_speak(msg, default_speed, self.engine.voices)
            except SpeakError as e:
                await self._send_error(ws, str(e))
                continue
            try:
                await self._stream(ws, speak)
            except ConnectionClosed:
                return

    async def _send_error(self, ws: ServerConnection, detail: str) -> None:
        await ws.send(json.dumps({"type": "error", "detail": detail}))

    async def _synthesize(self, sentence: str, speak: Speak) -> np.ndarray:
        async with self._synth_slots:
            return await asyncio.to_thread(self.engine.synthesize, sentence, speak.voice, speak.lang, speak.speed)

    async def _stream(self, ws: ServerConnection, speak: Speak) -> None:
        started = time.perf_counter()
        request_id = uuid.uuid4().hex
        sentences = split_sentences(speak.text)
        pause = np.zeros(int(self.engine.sample_rate * SENTENCE_PAUSE_SEC), dtype=np.float32)
        seg, audio_sec, ttfa_ms = 0, 0.0, None
        # Synthesize the next sentence while the current one is being sent
        pending = asyncio.create_task(self._synthesize(sentences[0], speak))
        try:
            for i in range(len(sentences)):
                audio = await pending
                if i + 1 < len(sentences):
                    pending = asyncio.create_task(self._synthesize(sentences[i + 1], speak))
                    audio = np.concatenate([audio, pause])
                for payload, seconds in encode_frames(audio, self.engine.sample_rate, speak.fmt, speak.rate):
                    seg += 1
                    t_ms = round((time.perf_counter() - started) * 1000)
                    meta = {"type": "meta", "seg": seg, "sample_rate": speak.rate, "format": speak.fmt,
                            "bytes": len(payload), "audio_sec": round(seconds, 3), "t_ms": t_ms}
                    if ttfa_ms is None:
                        ttfa_ms = meta["ttfa_ms"] = t_ms
                    await ws.send(json.dumps(meta))
                    await ws.send(payload)
                    audio_sec += seconds
        except ConnectionClosed:
            raise
        except Exception as e:
            log.exception("speak %s failed", request_id)
            await self._send_error(ws, f"synthesis failed: {e}")
            return
        finally:
            if not pending.done():
                pending.cancel()

        tts_ms = round((time.perf_counter() - started) * 1000)
        await ws.send(json.dumps({"type": "done", "segments": seg, "tts_ms": tts_ms,
                                  "audio_sec": round(audio_sec, 3), "model": self.engine.label,
                                  "request_id": request_id}))
        log.info("speak %s voice=%s lang=%s chars=%d segments=%d audio_sec=%.2f ttfa_ms=%s tts_ms=%d",
                 request_id, speak.voice, speak.lang, len(speak.text), seg, audio_sec, ttfa_ms, tts_ms)

    def serve(self, host: str | None = None, port: int | None = None):
        return serve(
            self.handler,
            self.settings.host if host is None else host,
            self.settings.port if port is None else port,
            process_request=self.process_request,
            ping_interval=self.settings.ping_interval_s,
            ping_timeout=self.settings.ping_interval_s,
            max_size=self.settings.max_message_bytes,
        )
