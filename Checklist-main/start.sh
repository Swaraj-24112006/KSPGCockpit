#!/usr/bin/env bash

# ==============================================================================
# TPM Smart Verify — Full Stack Launcher
# Starts: 1) MinIO S3 (:9000), 2) Express Backend (:3001), 3) Vite Frontend (:3000)
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Ensure environment tools (Node, MinIO, Python) are available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║       🚀 Starting TPM Smart Verify Full Stack          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 1. Start MinIO if not running
if ! lsof -i :9000 >/dev/null 2>&1; then
  echo "📦 Starting MinIO S3 storage on port 9000..."
  MINIO_BIN="/opt/homebrew/bin/minio"
  if [ ! -f "$MINIO_BIN" ]; then
    MINIO_BIN="$(which minio 2>/dev/null || true)"
  fi

  if [ -z "$MINIO_BIN" ]; then
    echo "⚠️  MinIO binary not found. Install via 'brew install minio'."
  else
    MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin \
      "$MINIO_BIN" server ~/minio-data --address :9000 --console-address :9001 > /dev/null 2>&1 &
    sleep 1
    echo "   ✓ MinIO S3 running at http://127.0.0.1:9000"
    echo "   ✓ MinIO Web Console at http://127.0.0.1:9001 (minioadmin / minioadmin)"
  fi
else
  echo "✓ MinIO S3 is already running on port 9000"
fi

# Cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Start Django Backend
echo "⚙️  Starting Django API Server on port 3001..."
backend/venv/bin/python backend/manage.py runserver 0.0.0.0:3001 &

# Wait for backend to mount
sleep 2

# 3. Start Vite Frontend
echo "💻 Starting Vite Frontend on http://localhost:3000..."
echo ""
echo "Access URLs:"
echo " • Frontend Web App:     http://localhost:3000"
echo " • Backend API & Health: http://localhost:3001/api/health"
echo " • MinIO Object Store:   http://localhost:9000 (Console: :9001)"
echo ""
echo "Press Ctrl+C anytime to stop."
echo "--------------------------------------------------------"

npx vite --port=3000 --host=0.0.0.0

wait
