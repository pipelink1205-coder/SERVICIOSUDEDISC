#!/usr/bin/env bash
# Respaldo de la base de datos y de las llaves (sal del documento y secreto de sesión).
# NO incluye los libros originales: contienen datos personales y se conservan en el equipo de origen.
# Lo ejecuta cron cada noche como el usuario «analitica»; conserva 14 días.
#
# Importante: la sal del documento es lo que permite comparar personas entre cortes.
# Copia periódicamente /var/backups/analitica a otro lugar fuera de este servidor.
set -euo pipefail

DATOS="${EPI_DATA_DIR:-/var/lib/analitica}"
DEST="${RESPALDOS:-/var/backups/analitica}"

install -d -m 700 "$DEST"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ -f "$DATOS/analitica.db" ]; then
  # Copia consistente aunque la aplicación esté escribiendo.
  /usr/bin/python3 - "$DATOS/analitica.db" "$TMP/analitica.db" <<'PY'
import sqlite3, sys
origen = sqlite3.connect(sys.argv[1])
destino = sqlite3.connect(sys.argv[2])
origen.backup(destino)
destino.close()
origen.close()
PY
fi
cp -p "$DATOS"/.epi_* "$TMP"/ 2>/dev/null || true

ARCHIVO="$DEST/analitica-$(date +%Y%m%d-%H%M).tar.gz"
tar -czf "$ARCHIVO" -C "$TMP" .
chmod 600 "$ARCHIVO"
find "$DEST" -name 'analitica-*.tar.gz' -mtime +14 -delete
echo "$(date -Is) respaldo creado: $ARCHIVO"
