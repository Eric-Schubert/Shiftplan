#!/bin/sh
set -e

# Same config lookup as setup.js; prints the main and admin DB path, one per line.
DB_PATHS="$(node -e "
const fs = require('node:fs');
const path = require('node:path');
const configPath = process.env.SHIFTPLAN_BACKEND_CONFIG_PATH?.trim() || '/app/config/backend.config.json';
const db = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf-8')).database;
const dir = path.resolve('/app', db.directory);
console.log(path.join(dir, db.mainFile));
console.log(path.join(dir, db.adminFile));
")"
DB_MAIN="$(printf '%s\n' "$DB_PATHS" | sed -n 1p)"
DB_ADMIN="$(printf '%s\n' "$DB_PATHS" | sed -n 2p)"

if [ ! -f "$DB_MAIN" ] || [ ! -f "$DB_ADMIN" ]; then
  echo "[entrypoint] Databases not found. Running setup.js..."
  node /app/setup.js
  echo "[entrypoint] Setup completed."
else
  echo "[entrypoint] Databases found. Skipping setup."
fi

echo "[entrypoint] Starting Shiftplan..."
exec node /app/.output/server/index.mjs
