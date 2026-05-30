#!/bin/bash
# SessionStart hook — installs Node and Python dependencies.
# Runs async so the session starts immediately while deps load in background.
set -euo pipefail

echo '{"async": true, "asyncTimeout": 300000}'

cd "${CLAUDE_PROJECT_DIR:-.}"

# ── Node dependencies ────────────────────────────────────────────────────────
# noproxy=* in .npmrc forces pnpm/undici to bypass the Claude Code proxy,
# which otherwise triggers a URLSearchParams bug. Skip if already present.
if [ ! -d node_modules ]; then
  pnpm install --prefer-offline 2>/dev/null \
    || pnpm install --network-concurrency=1 \
    || echo "WARN: pnpm install failed — node_modules unavailable this session"
else
  echo "node_modules present — skipping pnpm install"
fi

# ── Python dependencies ──────────────────────────────────────────────────────
uv sync --project mcp 2>/dev/null \
  || echo "WARN: uv sync failed — Python deps may be unavailable"
