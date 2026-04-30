#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/client"
BACKEND_DIR="$ROOT_DIR/server"
APACHE_DIST_DIR="/var/www/jim/client/dist"
BACKEND_PORT="${BACKEND_PORT:-3000}"
BACKEND_LOG_FILE="$BACKEND_DIR/backend.log"
BACKEND_PID_FILE="$BACKEND_DIR/backend.pid"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

get_listener_pids() {
  ss -ltnp \
    | awk -v port=":${BACKEND_PORT}" '$4 ~ port {print $NF}' \
    | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' \
    | sort -u
}

wait_for_port_free() {
  local retries=20
  local sleep_seconds=0.5

  for _ in $(seq 1 "$retries"); do
    if ! ss -ltnp | awk -v port=":${BACKEND_PORT}" '$4 ~ port { found=1 } END { exit found ? 0 : 1 }'; then
      return 0
    fi
    sleep "$sleep_seconds"
  done

  return 1
}

wait_for_backend() {
  local retries=30
  local sleep_seconds=1

  for _ in $(seq 1 "$retries"); do
    if ss -ltnp | awk -v port=":${BACKEND_PORT}" '$4 ~ port { found=1 } END { exit found ? 0 : 1 }'; then
      return 0
    fi
    sleep "$sleep_seconds"
  done

  return 1
}

require_cmd npm
require_cmd rsync
require_cmd ss
require_cmd awk
require_cmd sed
require_cmd sort

log "Building frontend in $FRONTEND_DIR"
npm --prefix "$FRONTEND_DIR" run build

if [[ ! -d "$FRONTEND_DIR/dist" ]]; then
  echo "Build output not found at $FRONTEND_DIR/dist" >&2
  exit 1
fi

log "Syncing frontend dist to $APACHE_DIST_DIR"
if ! rsync -a --delete "$FRONTEND_DIR/dist/" "$APACHE_DIST_DIR/"; then
  log "Direct sync failed, retrying with sudo"
  sudo rsync -a --delete "$FRONTEND_DIR/dist/" "$APACHE_DIST_DIR/"
fi

log "Stopping backend on port $BACKEND_PORT (if running)"
existing_pids="$(get_listener_pids || true)"
if [[ -n "$existing_pids" ]]; then
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    log "Sending SIGTERM to PID $pid"
    kill "$pid" || true
  done <<< "$existing_pids"

  if ! wait_for_port_free; then
    log "Port still in use; forcing stop"
    existing_pids="$(get_listener_pids || true)"
    if [[ -n "$existing_pids" ]]; then
      while IFS= read -r pid; do
        [[ -z "$pid" ]] && continue
        log "Sending SIGKILL to PID $pid"
        kill -9 "$pid" || true
      done <<< "$existing_pids"
    fi
  fi
else
  log "No backend process currently bound to port $BACKEND_PORT"
fi

log "Starting backend with npm start"
cd "$BACKEND_DIR"
nohup npm start > "$BACKEND_LOG_FILE" 2>&1 &
new_pid=$!
echo "$new_pid" > "$BACKEND_PID_FILE"

if ! wait_for_backend; then
  echo "Backend failed to listen on port $BACKEND_PORT. Check $BACKEND_LOG_FILE" >&2
  exit 1
fi

log "Deploy complete"
log "Backend PID: $new_pid"
log "Backend log: $BACKEND_LOG_FILE"
