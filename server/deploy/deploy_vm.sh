#!/usr/bin/env bash
# Ship server/ to the VM over SSH and run deploy/remote_install.sh there.
#   VM_HOST=... VM_PORT=1025 VM_USER=ubuntu VOICE_TOKENS_FILE=<path on the VM> server/deploy/deploy_vm.sh
# Optional: CPU_TTS_PORT (default 8091), CPU_TTS_THREADS (default 4), REMOTE_DIR (default cpu_tts).
set -euo pipefail

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
: "${VM_HOST:?set VM_HOST}"
: "${VOICE_TOKENS_FILE:?set VOICE_TOKENS_FILE to the tokens file path on the VM}"
VM_PORT="${VM_PORT:-22}"
VM_USER="${VM_USER:-ubuntu}"
REMOTE_DIR="${REMOTE_DIR:-cpu_tts}"
SSH=(ssh -p "$VM_PORT" "$VM_USER@$VM_HOST")

echo "== Copying $SERVER_DIR to $VM_USER@$VM_HOST:~/$REMOTE_DIR"
tar -C "$SERVER_DIR" --exclude=./models --exclude=./.venv --exclude=__pycache__ --exclude=.pytest_cache -czf - . \
  | "${SSH[@]}" "mkdir -p ~/$REMOTE_DIR && tar -C ~/$REMOTE_DIR -xzf -"

echo "== Installing on the VM"
"${SSH[@]}" -t "VOICE_TOKENS_FILE='$VOICE_TOKENS_FILE' CPU_TTS_PORT='${CPU_TTS_PORT:-8091}' \
  CPU_TTS_THREADS='${CPU_TTS_THREADS:-4}' ~/$REMOTE_DIR/deploy/remote_install.sh"
