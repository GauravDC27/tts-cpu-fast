#!/usr/bin/env bash
# Fetch the Kokoro-82M v1.0 ONNX weights and voice pack into server/models/ and verify them.
set -euo pipefail

BASE="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
DIR="$(cd "$(dirname "$0")/.." && pwd)/models"
mkdir -p "$DIR"

declare -A SHA256=(
  [kokoro-v1.0.onnx]=7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5
  [kokoro-v1.0.int8.onnx]=6e742170d309016e5891a994e1ce1559c702a2ccd0075e67ef7157974f6406cb
  [voices-v1.0.bin]=bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d
)

for file in kokoro-v1.0.onnx kokoro-v1.0.int8.onnx voices-v1.0.bin; do
  if [ ! -s "$DIR/$file" ]; then
    echo "Downloading $file"
    curl -fSL -o "$DIR/$file.part" "$BASE/$file"
    mv "$DIR/$file.part" "$DIR/$file"
  fi
  echo "${SHA256[$file]}  $DIR/$file" | sha256sum -c -
done
