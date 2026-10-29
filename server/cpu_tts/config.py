"""Server settings, read only from the environment."""

import os
from dataclasses import dataclass
from pathlib import Path


class ConfigError(RuntimeError):
    pass


def _load_tokens(env: dict[str, str]) -> frozenset[str]:
    tokens = [t.strip() for t in env.get("VOICE_TOKENS", "").split(",")]
    token_file = env.get("VOICE_TOKENS_FILE")
    if token_file:
        tokens += [line.strip() for line in Path(token_file).read_text().splitlines()]
    return frozenset(t for t in tokens if t)


@dataclass(frozen=True)
class Settings:
    model_path: str
    voices_path: str
    model_label: str
    tokens: frozenset[str]
    host: str
    port: int
    threads: int
    max_concurrency: int
    idle_timeout_s: float = 3600.0
    ping_interval_s: float = 20.0
    max_message_bytes: int = 16 * 1024 * 1024

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Settings":
        env = dict(os.environ if env is None else env)
        model_path = env.get("CPU_TTS_MODEL_PATH", "models/kokoro-v1.0.onnx")
        tokens = _load_tokens(env)
        if not tokens:
            # Fail closed: the endpoint must never run without authentication
            raise ConfigError("No access tokens: set VOICE_TOKENS (comma-separated) or VOICE_TOKENS_FILE.")

        cores = os.cpu_count() or 1
        threads = int(env.get("CPU_TTS_THREADS", min(4, cores)))
        return cls(
            model_path=model_path,
            voices_path=env.get("CPU_TTS_VOICES_PATH", "models/voices-v1.0.bin"),
            model_label=env.get("CPU_TTS_MODEL_LABEL", Path(model_path).name.removesuffix(".onnx")),
            tokens=tokens,
            host=env.get("CPU_TTS_HOST", "0.0.0.0"),
            port=int(env.get("CPU_TTS_PORT", "8080")),
            threads=threads,
            max_concurrency=int(env.get("CPU_TTS_MAX_CONCURRENCY", max(1, cores // threads))),
        )
