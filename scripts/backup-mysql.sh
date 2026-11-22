#!/usr/bin/env bash
# Respaldo lógico diario de SmartSys. Ejecutar en el host con Docker.
set -euo pipefail

CONTAINER="${CONTAINER:-smartsys-mysql}"
DATABASE="${DATABASE:-smartsys}"
OUT_DIR="${OUT_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date +%F_%H%M%S)"

mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/smartsys-$STAMP.sql.gz"

docker exec "$CONTAINER" sh -c \
  "mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --routines --triggers $DATABASE | gzip" \
  > "$FILE"

if [ ! -s "$FILE" ]; then
  echo "ERROR: el respaldo quedó vacío: $FILE" >&2
  exit 1
fi

echo "Respaldo creado: $FILE ($(du -h "$FILE" | cut -f1))"
find "$OUT_DIR" -name 'smartsys-*.sql.gz' -type f -mtime "+$RETENTION_DAYS" -delete
