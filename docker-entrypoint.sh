#!/bin/sh
set -e

# Same config loader as setup.js and the server (defaults plus the optional mounted file);
# prints the main and admin DB path, one per line.
DB_PATHS="$(node --input-type=module -e "
import path from 'node:path';
import { loadBackendConfig } from '/app/server/lib/config/load.js';
const db = loadBackendConfig({ cwd: '/app' }).database;
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
