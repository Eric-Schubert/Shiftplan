#!/bin/sh
set -e

# DB initialisieren falls noch nicht vorhanden
if [ ! -f /app/db/db.sqlite ] || [ ! -f /app/db/admin.sqlite ]; then
  echo "[entrypoint] Datenbanken nicht gefunden – führe setup.js aus..."
  node /app/setup.js
  echo "[entrypoint] Setup abgeschlossen."
else
  echo "[entrypoint] Datenbanken vorhanden – überspringe Setup."
fi

echo "[entrypoint] Starte Schichtplaner..."
exec node /app/.output/server/index.mjs
