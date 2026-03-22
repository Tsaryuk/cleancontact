#!/usr/bin/env bash
# CleanContact — быстрый запуск без Docker
# Требования: Python 3.9+, Node.js 18+
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== CleanContact быстрый запуск ==="

# --- Backend ---
if [ ! -d "$ROOT/.venv" ]; then
  echo ">>> Создаю virtual env..."
  python3 -m venv "$ROOT/.venv"
fi

echo ">>> Устанавливаю зависимости backend..."
"$ROOT/.venv/bin/pip" install -r "$ROOT/backend/requirements.txt" -q

echo ">>> Запускаю backend на :8000..."
DB_PATH="$ROOT/cleancontact.db" \
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
  "$ROOT/.venv/bin/uvicorn" app.main:app \
  --host 0.0.0.0 --port 8000 \
  --app-dir "$ROOT/backend" &
BACKEND_PID=$!

# --- Frontend ---
echo ">>> Устанавливаю зависимости frontend..."
cd "$ROOT/frontend" && npm install --silent

echo ">>> Запускаю frontend на :3000..."
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev -- --port 3000 &
FRONTEND_PID=$!

echo ""
echo "✅ Готово!"
echo "   UI:  http://localhost:3000"
echo "   API: http://localhost:8000/docs"
echo ""
echo "Для остановки: kill $BACKEND_PID $FRONTEND_PID"
echo "Или Ctrl+C"

wait
