"""Mapping of request voice/language to a Kokoro voice and espeak language."""

import re

# Kokoro voice names start with a letter that encodes their language.
# Japanese (j) and Chinese (z) voices need a different G2P front end, so they are not served.
LANG_BY_PREFIX = {
    "a": "en-us", "b": "en-gb", "h": "hi", "e": "es", "f": "fr-fr", "i": "it", "p": "pt-br",
}
LANGUAGE_ALIASES = {
    "en": "en-us", "en-us": "en-us", "en-gb": "en-gb", "hi": "hi", "es": "es",
    "fr": "fr-fr", "fr-fr": "fr-fr", "it": "it", "pt": "pt-br", "pt-br": "pt-br",
}
DEFAULT_VOICE = {
    "en-us": "af_heart", "en-gb": "bf_emma", "hi": "hf_alpha", "es": "ef_dora",
    "fr-fr": "ff_siwis", "it": "if_sara", "pt-br": "pf_dora",
}
DEVANAGARI = re.compile(r"[ऀ-ॿ]")


class VoiceError(ValueError):
    pass


def servable_voices(all_voices: set[str]) -> set[str]:
    return {v for v in all_voices if v[:1] in LANG_BY_PREFIX}


def resolve(text: str, voice: str | None, language: str | None, voices: set[str]) -> tuple[str, str]:
    """Pick (voice, espeak language). Omitted language follows the voice, else the script of the text."""
    if language is not None:
        if language.lower() not in LANGUAGE_ALIASES:
            raise VoiceError(f"unsupported language {language!r}; use one of {sorted(LANGUAGE_ALIASES)}")
        lang = LANGUAGE_ALIASES[language.lower()]
    elif voice is not None and voice[:1] in LANG_BY_PREFIX:
        lang = LANG_BY_PREFIX[voice[0]]
    else:
        lang = "hi" if DEVANAGARI.search(text) else "en-us"

    if voice is None:
        voice = DEFAULT_VOICE[lang]
    if voice not in voices:
        raise VoiceError(f"unknown voice {voice!r}")
    return voice, lang
