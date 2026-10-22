#!/usr/bin/env bash
# Actualiza Analítica: trae los cambios de GitHub, reinstala dependencias, recompila la
# interfaz y reinicia el servicio.
#
#   sudo bash /opt/analitica/deploy/actualizar.sh            (trae cambios y despliega)
#   sudo bash /opt/analitica/deploy/actualizar.sh --sin-pull (solo recompila; lo usa instalar.sh)
set -euo pipefail

APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USR=analitica
NODE_DIR=/opt/node-analitica
ENV_FILE="$APP/backend/.env"

die() { echo "ERROR: $*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die "Ejecútalo con sudo."
id "$USR" >/dev/null 2>&1 || die "Falta el usuario $USR. Corre primero deploy/instalar.sh."

# Ejecuta un comando como el usuario del servicio (el código nunca se compila como root).
como() { runuser -u "$USR" -- env HOME=/var/cache/analitica PATH="$NODE_DIR/bin:$PATH" NODE_OPTIONS=--max-old-space-size=1536 "$@"; }

if [ "${1:-}" != "--sin-pull" ]; then
  echo "==> Trayendo cambios"
  como git -C "$APP" pull --ff-only
fi

# Node se instala aparte, solo para compilar la interfaz, sin tocar el Node del sistema.
if [ ! -x "$NODE_DIR/bin/node" ]; then
  echo "==> Descargando Node.js (solo para compilar la interfaz)"
  case "$(uname -m)" in
    x86_64) ARQ=linux-x64 ;;
    aarch64) ARQ=linux-arm64 ;;
    *) die "Arquitectura no soportada: $(uname -m)" ;;
  esac
  BASE=https://nodejs.org/dist/latest-v22.x
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  curl -fsSL "$BASE/SHASUMS256.txt" -o "$TMP/SHASUMS256.txt"
  ARCHIVO="$(awk -v a="$ARQ" '$2 ~ a".tar.xz$" {print $2; exit}' "$TMP/SHASUMS256.txt")"
  [ -n "$ARCHIVO" ] || die "No encontré el paquete de Node para $ARQ."
  curl -fsSL "$BASE/$ARCHIVO" -o "$TMP/$ARCHIVO"
  (cd "$TMP" && grep " $ARCHIVO\$" SHASUMS256.txt | sha256sum -c -) || die "El checksum de Node no coincide."
  install -d "$NODE_DIR"
  tar -xJf "$TMP/$ARCHIVO" -C "$NODE_DIR" --strip-components=1
fi

echo "==> Dependencias de Python"
[ -x "$APP/backend/.venv/bin/python" ] || como python3 -m venv "$APP/backend/.venv"
como "$APP/backend/.venv/bin/pip" install -q --disable-pip-version-check -r "$APP/backend/requirements.txt"

echo "==> Compilando la interfaz (puede tardar unos minutos)"
cd "$APP/frontend"
como npm ci --no-audit --no-fund
como npm run build
[ -f "$APP/frontend/dist/index.html" ] || die "La compilación no generó frontend/dist."

echo "==> Reiniciando el servicio"
systemctl restart analitica
PUERTO="$(grep -E '^EPI_PUERTO=' "$ENV_FILE" | cut -d= -f2)"
for _ in $(seq 1 30); do
  if curl -fsS --max-time 3 "http://127.0.0.1:${PUERTO:-8020}/api/salud" >/dev/null 2>&1; then
    echo "OK: la aplicación responde."
    exit 0
  fi
  sleep 1
done
journalctl -u analitica -n 30 --no-pager || true
die "La aplicación no arrancó. Revisa: journalctl -u analitica -n 100"
