"""Run the /ws/cpu/tts server: python -m cpu_tts"""

import asyncio
import logging
import signal

from . import WS_PATH
from .config import Settings
from .engine import KokoroEngine
from .server import CpuTtsServer

log = logging.getLogger("cpu_tts")


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    settings = Settings.from_env()
    engine = KokoroEngine(settings.model_path, settings.voices_path, settings.model_label, settings.threads)
    log.info("model %s (%s, sha256 %s), %d voices, %d threads x %d concurrent",
             engine.label, settings.model_path, engine.model_sha256[:12], len(engine.voices),
             settings.threads, settings.max_concurrency)

    stop = asyncio.get_running_loop().create_future()
    for sig in (signal.SIGINT, signal.SIGTERM):
        asyncio.get_running_loop().add_signal_handler(sig, stop.set_result, None)

    async with CpuTtsServer(engine, settings).serve():
        log.info("listening on ws://%s:%d%s", settings.host, settings.port, WS_PATH)
        await stop


if __name__ == "__main__":
    asyncio.run(main())
