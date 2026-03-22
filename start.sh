#!/usr/bin/env bash
# CleanContact — запуск без Docker
# Требования: Python 3.9+, Node.js 18+
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_LOG="$ROOT/backend.log"
FRONTEND_LOG="$ROOT/frontend.log"

echo "╔══════════════════════════════════╗"
echo "║   CleanContact — запуск          ║"
echo "╚══════════════════════════════════╝"
echo ""

# ── Проверка зависимостей ────────────────────────────────────────────────────
fail() { echo ""; echo "❌ ОШИБКА: $*"; exit 1; }

command -v python3 >/dev/null 2>&1 || fail "python3 не найден. Установите Python 3.9+"
command -v node    >/dev/null 2>&1 || fail "node не найден. Установите Node.js 18+"
command -v npm     >/dev/null 2>&1 || fail "npm не найден. Установите Node.js 18+"

PY_VER=$(python3 -c "import sys; print(sys.version_info.minor)")
NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
echo "Python 3.$PY_VER  |  Node $NODE_VER"
echo ""

# ── Освободить порты ─────────────────────────────────────────────────────────
for PORT in 8000 3000; do
  PID=$(lsof -ti:"$PORT" 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "⚠️  Порт $PORT занят (PID $PID), останавливаю..."
    kill "$PID" 2>/dev/null || true
    sleep 1
  fi
done

# ── Backend ──────────────────────────────────────────────────────────────────
echo "▶ Backend: устанавливаю зависимости..."
if [ ! -d "$ROOT/.venv" ]; then
  python3 -m venv "$ROOT/.venv" || fail "Не удалось создать venv. Установите python3-venv."
fi
"$ROOT/.venv/bin/pip" install -r "$ROOT/backend/requirements.txt" -q \
  || fail "pip install завершился с ошибкой (лог: $BACKEND_LOG)"

echo "▶ Backend: запускаю на :8000..."
DB_PATH="$ROOT/cleancontact.db" \
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
  "$ROOT/.venv/bin/uvicorn" app.main:app \
  --host 0.0.0.0 --port 8000 \
  --app-dir "$ROOT/backend" \
  > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# Ждём готовности backend (до 20 сек)
echo -n "  Ожидаю backend"
for i in $(seq 1 20); do
  sleep 1
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    echo " ✓"
    break
  fi
  echo -n "."
  if [ "$i" -eq 20 ]; then
    echo ""
    echo "❌ Backend не запустился за 20 секунд."
    echo "── Лог backend ($BACKEND_LOG) ──"
    tail -30 "$BACKEND_LOG"
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
  fi
done

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "▶ Frontend: устанавливаю зависимости..."
cd "$ROOT/frontend"
npm install --prefer-offline --silent 2>>"$FRONTEND_LOG" \
  || fail "npm install завершился с ошибкой (лог: $FRONTEND_LOG)"

echo "▶ Frontend: запускаю на :3000..."
NEXT_PUBLIC_API_URL=http://localhost:8000 \
  npm run dev -- --port 3000 \
  >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# Ждём готовности frontend (до 30 сек)
echo -n "  Ожидаю frontend"
for i in $(seq 1 30); do
  sleep 1
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    echo " ✓"
    break
  fi
  echo -n "."
  if [ "$i" -eq 30 ]; then
    echo ""
    echo "❌ Frontend не запустился за 30 секунд."
    echo "── Лог frontend ($FRONTEND_LOG) ──"
    tail -30 "$FRONTEND_LOG"
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    exit 1
  fi
done

# ── Готово ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅  CleanContact запущен!               ║"
echo "║                                          ║"
echo "║  Откройте:  http://localhost:3000        ║"
echo "║  API docs:  http://localhost:8000/docs   ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Нажмите Ctrl+C для остановки."
echo "(Логи: $BACKEND_LOG, $FRONTEND_LOG)"
echo ""

# Cleanup on exit
trap "echo ''; echo 'Останавливаю...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT INT TERM

wait
