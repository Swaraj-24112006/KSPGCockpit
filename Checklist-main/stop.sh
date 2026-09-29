#!/usr/bin/env bash

# ==============================================================================
# TPM Smart Verify — Stop All Services
# Stops processes on ports 3000 (Vite), 3001 (Backend), and 9000 (MinIO)
# ==============================================================================

echo "🛑 Stopping TPM Smart Verify services..."

for port in 3000 3001 9000 9001; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Stopping service on port $port (PID: $pids)..."
    kill -9 $pids 2>/dev/null || true
  fi
done

echo "✓ All services stopped."
