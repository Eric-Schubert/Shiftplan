#!/bin/sh
set -e

DB_MAIN="$(node -e "const path=require('node:path'); const c=require('/app/config/backend.config.json'); const dir=path.isAbsolute(c.database.directory)?c.database.directory:path.join('/app', c.database.directory); console.log(path.join(dir, c.database.mainFile))")"
DB_ADMIN="$(node -e "const path=require('node:path'); const c=require('/app/config/backend.config.json'); const dir=path.isAbsolute(c.database.directory)?c.database.directory:path.join('/app', c.database.directory); console.log(path.join(dir, c.database.adminFile))")"


if [ ! -f "$DB_MAIN" ] || [ ! -f "$DB_ADMIN" ]; then
  echo "[entrypoint] Datenbanken nicht gefunden – führe setup.js aus..."
  node /app/setup.js
  echo "[entrypoint] Setup abgeschlossen."
else
  echo "[entrypoint] Datenbanken vorhanden – überspringe Setup."
fi

echo "[entrypoint] Starte Schichtplaner..."
exec node /app/.output/server/index.mjs
