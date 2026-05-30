#!/bin/bash
# SessionStart hook — installs Node and Python dependencies.
# Runs async so the session starts immediately while deps load in background.
set -euo pipefail

echo '{"async": true, "asyncTimeout": 300000}'

cd "${CLAUDE_PROJECT_DIR:-.}"

# ── Node dependencies (root — excludes site/) ────────────────────────────────
# pnpm's undici fails through the Claude Code proxy (URLSearchParams bug).
# noproxy=* in .npmrc forces direct HTTPS which works. Skip if already present.
if [ ! -d node_modules ]; then
  pnpm install --prefer-offline 2>/dev/null \
    || pnpm install --network-concurrency=1 \
    || echo "WARN: pnpm install failed — node_modules unavailable this session"
else
  echo "node_modules present — skipping pnpm install"
fi

# ── Site / docs dependencies (npm — not in pnpm workspace) ───────────────────
# npm uses libcurl which is unaffected by the undici proxy bug.
if [ ! -d site/node_modules ]; then
  npm install --prefix site --prefer-offline 2>/dev/null \
    || npm install --prefix site \
    || echo "WARN: npm install (site) failed — site/node_modules unavailable this session"
else
  echo "site/node_modules present — skipping npm install for site"
fi

# ── Python dependencies ──────────────────────────────────────────────────────
uv sync --project mcp 2>/dev/null \
  || echo "WARN: uv sync failed — Python deps may be unavailable"
