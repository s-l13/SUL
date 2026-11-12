#!/usr/bin/env bash
# Update the app on the server with a newly uploaded version (data is never touched).
#   sudo bash deploy/update.sh
set -euo pipefail
APP_DIR=/opt/daily-closing
DATA_DIR=/var/lib/daily-closing
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ "$(id -u)" -eq 0 ] || { echo "run with sudo"; exit 1; }
[ -f "$SRC_DIR/server.js" ] || { echo "run from inside the uploaded app folder"; exit 1; }

# stop the app, then take a safety copy of the database (stopped = the copy is consistent)
systemctl stop daily-closing
mkdir -p "$DATA_DIR/backups"
if [ -f "$DATA_DIR/shrakh.db" ]; then
  copy="$DATA_DIR/backups/before-update-$(date +%F-%H%M%S).db"
  cp "$DATA_DIR/shrakh.db" "$copy"
  echo "backup: $copy"
fi

rsync -a --delete --exclude node_modules --exclude data --exclude .git "$SRC_DIR/" "$APP_DIR/"
chown -R dailyclose:dailyclose "$APP_DIR" "$DATA_DIR"
cd "$APP_DIR" && sudo -u dailyclose -H npm ci --omit=dev --no-audit --no-fund
systemctl start daily-closing
sleep 2
if curl -fsS http://127.0.0.1:3000/healthz >/dev/null; then echo "updated ✔"; else echo "app not running — sudo journalctl -u daily-closing -n 50"; exit 1; fi
