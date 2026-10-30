#!/usr/bin/env bash
# Install or update the /ws/cpu/tts service on this machine, CPU only, then verify it.
# Runs on the VM. Needs VOICE_TOKENS_FILE: a file on this machine with the access tokens, one per line.
# USE_SYSTEMD=0 runs it with nohup instead of a systemd unit (for machines without systemd).
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${CPU_TTS_PORT:-8091}"
THREADS="${CPU_TTS_THREADS:-4}"
TOKENS_FILE="${VOICE_TOKENS_FILE:?set VOICE_TOKENS_FILE to the file holding the access tokens}"
USE_SYSTEMD="${USE_SYSTEMD:-1}"
VENV="$APP_DIR/.venv"

[ -s "$TOKENS_FILE" ] || { echo "Tokens file $TOKENS_FILE is missing or empty"; exit 1; }

echo "== Other configs or code already mentioning /ws/cpu/tts"
{ find /etc/nginx /etc/caddy /etc/haproxy -type f 2>/dev/null
  find "$HOME" -maxdepth 4 -type f -size -2M \( -name '*.py' -o -name '*.conf' -o -name '*.y*ml' -o -name '*.toml' \
       -o -name '*.json' -o -name 'Caddyfile' \) -not -path '*/.venv/*' -not -path '*/site-packages/*' \
       -not -path '*/node_modules/*' -not -path "$APP_DIR/*" 2>/dev/null
} | xargs -r grep -Il "ws/cpu/tts" 2>/dev/null || echo "none"

running_here() {
  if [ "$USE_SYSTEMD" = 1 ]; then systemctl is-active --quiet cpu-tts; else [ -f "$APP_DIR/cpu_tts.pid" ] && kill -0 "$(cat "$APP_DIR/cpu_tts.pid")" 2>/dev/null; fi
}
if command -v ss >/dev/null && ss -ltn "( sport = :$PORT )" | grep -q LISTEN && ! running_here; then
  echo "Port $PORT is already used by another process; set CPU_TTS_PORT to a free port"; exit 1
fi

echo "== Installing into $VENV"
[ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r "$APP_DIR/requirements.txt"
"$VENV/bin/python" - <<'EOF'
import onnxruntime as ort
providers = ort.get_available_providers()
print("onnxruntime", ort.__version__, providers)
assert "CUDAExecutionProvider" not in providers, "a GPU build of onnxruntime is installed in this venv"
EOF
"$APP_DIR/scripts/download_models.sh"

echo "== Starting"
if [ "$USE_SYSTEMD" = 1 ]; then
  sed -e "s|@USER@|$(id -un)|" -e "s|@APP_DIR@|$APP_DIR|g" -e "s|@PORT@|$PORT|" \
      -e "s|@THREADS@|$THREADS|" -e "s|@TOKENS_FILE@|$TOKENS_FILE|" \
      "$APP_DIR/deploy/cpu-tts.service" | sudo tee /etc/systemd/system/cpu-tts.service >/dev/null
  sudo systemctl daemon-reload
  sudo systemctl enable -q cpu-tts
  sudo systemctl restart cpu-tts
  pid() { systemctl show -p MainPID --value cpu-tts; }
else
  [ -f "$APP_DIR/cpu_tts.pid" ] && kill "$(cat "$APP_DIR/cpu_tts.pid")" 2>/dev/null && sleep 1
  # exec, so $! is the server itself and no shell is left holding this script's stdout
  (cd "$APP_DIR" && exec env CPU_TTS_HOST=127.0.0.1 CPU_TTS_PORT="$PORT" CPU_TTS_THREADS="$THREADS" \
     VOICE_TOKENS_FILE="$TOKENS_FILE" CUDA_VISIBLE_DEVICES= nohup "$VENV/bin/python" -m cpu_tts) \
     >"$APP_DIR/cpu_tts.log" 2>&1 </dev/null &
  echo $! >"$APP_DIR/cpu_tts.pid"
  pid() { cat "$APP_DIR/cpu_tts.pid"; }
fi

echo "== Verifying"
for _ in $(seq 1 90); do
  curl -fsS "http://127.0.0.1:$PORT/healthz" 2>/dev/null && break
  [ "$USE_SYSTEMD" = 1 ] || running_here || break
  sleep 1
done
if ! curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null; then
  echo "FAIL: service did not come up. Last log lines:"
  if [ "$USE_SYSTEMD" = 1 ]; then sudo journalctl -u cpu-tts -n 25 --no-pager; else tail -n 25 "$APP_DIR/cpu_tts.log"; fi
  exit 1
fi

TOKEN="$(grep -m1 -v '^\s*$' "$TOKENS_FILE" | tr -d '[:space:]')"
status=$(curl -s -o /dev/null -w '%{http_code}' --http1.1 -m 3 \
  -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(head -c 16 /dev/urandom | base64)" \
  "http://127.0.0.1:$PORT/ws/cpu/tts?token=$TOKEN" || true)
[ "$status" = 101 ] || { echo "FAIL: WebSocket handshake returned $status, expected 101"; exit 1; }
echo "handshake: 101"

VOICE_TOKEN="$TOKEN" "$VENV/bin/python" "$APP_DIR/examples/client.py" \
  "Hello, this is the CPU voice check." /tmp/cpu_tts_check.wav "ws://127.0.0.1:$PORT"

if command -v nvidia-smi >/dev/null; then
  if nvidia-smi --query-compute-apps=pid --format=csv,noheader | grep -qx "$(pid)"; then
    echo "FAIL: the service is using the GPU"; exit 1
  fi
  echo "GPU: not used by PID $(pid)"
fi
echo "OK: /ws/cpu/tts is running on CPU at 127.0.0.1:$PORT (PID $(pid))"
