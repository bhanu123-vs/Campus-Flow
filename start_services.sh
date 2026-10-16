#!/bin/bash
set -e

# Kill any stale processes on 8001 and 8002
fuser -k 8001/tcp 2>/dev/null || true
fuser -k 8002/tcp 2>/dev/null || true

# Sanitize invalid or placeholder environment variables
if [[ "$ML_API_BASE_URL" != http://* && "$ML_API_BASE_URL" != https://* ]]; then
  export ML_API_BASE_URL="http://127.0.0.1:8001"
fi

if [[ "$VITE_API_BASE_URL" != http://* && "$VITE_API_BASE_URL" != https://* ]]; then
  export VITE_API_BASE_URL=""
fi

if [[ "$VITE_ML_API_BASE_URL" != http://* && "$VITE_ML_API_BASE_URL" != https://* ]]; then
  export VITE_ML_API_BASE_URL=""
fi

if [[ "$DATABASE_URL" != postgresql://* && "$DATABASE_URL" != postgres://* ]]; then
  unset DATABASE_URL
fi

# Start datathonapi on port 8001
PYTHONPATH=. /venv/bin/uvicorn datathonapi.app.main:app --host 0.0.0.0 --port 8001 &

# Start main backend on port 8002
PYTHONPATH=. /venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8002 &

# Start Vite dev server on port 3000 as the foreground process
exec vite --port=3000 --host=0.0.0.0
