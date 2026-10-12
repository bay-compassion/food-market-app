# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["kokoro-onnx==0.6.1", "soundfile==0.13.1"]
# ///
"""Local neural narration, called once per video by voice.mjs through uv.

The Apache-2.0 Kokoro v1.0 model and voices download once into the ignored
out/kokoro folder. No API key or hosted speech service is needed.
"""

import json
import shutil
import sys
from pathlib import Path
from urllib.request import urlopen

import soundfile as sf
from kokoro_onnx import Kokoro


def model_file(cache: Path, name: str) -> Path:
    target = cache / name
    if not target.exists():
        url = (
            "https://github.com/thewh1teagle/kokoro-onnx/releases/download/"
            f"model-files-v1.1/{name}"
        )
        temporary = target.with_suffix(target.suffix + ".part")
        print(f"Downloading {name}", flush=True)
        with urlopen(url, timeout=120) as response, temporary.open("wb") as output:
            shutil.copyfileobj(response, output)
        temporary.replace(target)
    return target


def main():
    request = json.load(sys.stdin)
    cache = Path(request["cache"])
    cache.mkdir(parents=True, exist_ok=True)
    voice = request["voice"]
    model = Kokoro(
        str(model_file(cache, "kokoro-v1.0.onnx")),
        str(model_file(cache, "voices-v1.0.bin")),
    )

    for line in request["lines"]:
        samples, sample_rate = model.create(
            line.get("say", line["text"]),
            voice=voice["name"],
            speed=voice.get("speed", 1.0),
            lang=voice.get("language", "en-us"),
        )
        output = Path(request["clips"]) / f'{line["id"]}.kokoro.wav'
        sf.write(output, samples, sample_rate, subtype="PCM_16")
        print(f'Voiced {line["id"]}', flush=True)


if __name__ == "__main__":
    main()
