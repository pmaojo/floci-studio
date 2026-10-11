#!/usr/bin/env bash
# Floci Studio — full-stack E2E harness orchestrator.
#
# Brings up the three Floci services and seeds a realistic dataset, then
# (optionally) runs the Playwright GUI tour that captures the documentation
# screenshots.
#
#   ┌──────────────┐   /aws   ┌───────────────────┐
#   │ Vite GUI     │─────────▶│ emulator :4566    │  moto-backed AWS API
#   │ :3000        │ /sidecar │ (stands in for    │  (real engine image when
#   └──────┬───────┘────┐     │  floci/floci)     │   it can be pulled)
#          │            │     └───────────────────┘
#          ▼            ▼              ▲
#     browser     ┌───────────┐  AWS   │
#                 │ sidecar   │────────┘
#                 │ :8000     │  boto3 / aws-cli
#                 └───────────┘
#
# Usage:
#   e2e/run.sh up        # start emulator + sidecar + GUI, seed data
#   e2e/run.sh test      # up (if needed) + run the Playwright tour
#   e2e/run.sh down      # stop everything
#
# In sandboxes without the Playwright-pinned browser, set
# PLAYWRIGHT_CHROMIUM_PATH to a compatible Chromium before `test`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VENV="e2e/.venv"
PY="$VENV/bin/python"
LOGS=".e2e-logs"
export AWS_ENDPOINT_URL="http://localhost:4566"
export AWS_DEFAULT_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"

mkdir -p "$LOGS" e2e/screenshots

ensure_venv() {
  if [ ! -x "$PY" ]; then
    echo "[e2e] creating venv + installing requirements…"
    uv venv "$VENV"
    uv pip install --python "$PY" -r e2e/requirements.txt
  fi
}

wait_for() { # url, name
  for _ in $(seq 1 30); do
    if curl -sf "$1" >/dev/null 2>&1; then echo "[e2e] $2 ready"; return 0; fi
    sleep 1
  done
  echo "[e2e] timed out waiting for $2 ($1)"; return 1
}

up() {
  ensure_venv

  echo "[e2e] starting emulator (:4566)…"
  FLOCI_EMULATOR_PORT=4566 "$PY" e2e/emulator.py >"$LOGS/emulator.log" 2>&1 &
  wait_for "$AWS_ENDPOINT_URL/_localstack/health" "emulator"

  echo "[e2e] seeding resources…"
  "$PY" e2e/seed.py | tail -25

  echo "[e2e] starting sidecar (:8000)…"
  # Put the e2e venv on PATH so the sidecar's `aws` subprocess resolves.
  PATH="$ROOT/$VENV/bin:$PATH" \
  SIDECAR_PORT=8000 SIDECAR_HOST=0.0.0.0 \
  SIDECAR_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000" \
  uv run --project mcp uvicorn floci_backend.server:app --port 8000 --host 0.0.0.0 --app-dir mcp \
    >"$LOGS/sidecar.log" 2>&1 &
  wait_for "http://localhost:8000/health" "sidecar"

  echo "[e2e] starting GUI (:3000)…"
  VITE_FLOCI_ENDPOINT="http://localhost:3000/aws" VITE_SIDECAR_URL="/sidecar" \
  VITE_REAL_DATA_ONLY=true DISABLE_HMR=true \
  FLOCI_PROXY_TARGET="http://localhost:4566" SIDECAR_PROXY_TARGET="http://localhost:8000" \
  pnpm run dev >"$LOGS/gui.log" 2>&1 &
  wait_for "http://localhost:3000/" "GUI"

  echo "[e2e] stack is up → http://localhost:3000"
}

down() {
  for port in 3000 8000 4566; do fuser -k "${port}/tcp" 2>/dev/null || true; done
  echo "[e2e] stack stopped"
}

run_test() {
  curl -sf "http://localhost:3000/" >/dev/null 2>&1 || up
  npx playwright test gui-tour --workers=1 --reporter=list
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  test) run_test ;;
  *) echo "usage: e2e/run.sh {up|down|test}"; exit 1 ;;
esac
