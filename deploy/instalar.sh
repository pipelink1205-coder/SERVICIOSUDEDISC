#!/usr/bin/env bash
# Instala Analítica (Unidad de Discapacidad) en un servidor Ubuntu que puede alojar otros sitios.
#
#   sudo bash /opt/analitica/deploy/instalar.sh <dominio> <correo-para-el-certificado>
#
# - Es idempotente: se puede repetir sin dañar lo ya instalado.
# - No modifica los sitios de nginx que ya existen: agrega uno nuevo y, si la prueba de
#   configuración falla, lo deshace y deja nginx como estaba.
# - Datos y secretos viven en /var/lib/analitica, fuera de la carpeta del código.
set -euo pipefail

DOMINIO="${1:-}"
CORREO="${2:-}"
APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USR=analitica
DATOS=/var/lib/analitica
RESPALDOS=/var/backups/analitica
WEBROOT=/var/www/letsencrypt
SITIO=/etc/nginx/sites-available/analitica
ENV_FILE="$APP/backend/.env"

die() { echo "ERROR: $*" >&2; exit 1; }
paso() { echo; echo "==> $*"; }

[ -n "$DOMINIO" ] && [ -n "$CORREO" ] || die "Uso: sudo bash $0 <dominio> <correo>"
[ "$(id -u)" -eq 0 ] || die "Ejecútalo con sudo."
grep -qi ubuntu /etc/os-release || die "Este script está pensado para Ubuntu."
[ -f "$APP/backend/run.py" ] || die "No encuentro el proyecto en $APP."

# Un nombre de sitio web solo admite letras, números y guiones: con guion bajo no se puede emitir HTTPS.
echo "$DOMINIO" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' \
  || die "El dominio '$DOMINIO' no es válido para HTTPS (usa guiones, no guiones bajos; ej. datos-discapacidad.ejemplo.cloud)."

paso "1/8 Comprobando que el dominio apunta a este servidor"
IP_DNS="$(getent ahostsv4 "$DOMINIO" | awk 'NR==1{print $1}' || true)"
IP_SRV="$(curl -4 -fsS --max-time 10 https://api.ipify.org || true)"
[ -n "$IP_DNS" ] || die "$DOMINIO todavía no resuelve. Crea el registro A en el DNS y espera unos minutos."
echo "DNS: $DOMINIO -> $IP_DNS   |   IP pública de este servidor: ${IP_SRV:-desconocida}"
if [ -n "$IP_SRV" ] && [ "$IP_DNS" != "$IP_SRV" ] && [ "${OMITIR_DNS:-0}" != "1" ]; then
  die "El dominio apunta a $IP_DNS pero este servidor es $IP_SRV. Corrige el registro A (o repite con OMITIR_DNS=1 si sabes lo que haces)."
fi

paso "2/8 Instalando paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip nginx certbot curl xz-utils openssl ca-certificates git >/dev/null

paso "3/8 Creando usuario y carpetas"
id "$USR" >/dev/null 2>&1 || useradd --system --home-dir /var/cache/analitica --create-home --shell /usr/sbin/nologin "$USR"
install -d -o "$USR" -g "$USR" -m 700 "$DATOS" "$RESPALDOS"
install -d -m 755 "$WEBROOT"
chown -R "$USR:$USR" "$APP"

paso "4/8 Configuración de la aplicación"
if [ ! -f "$ENV_FILE" ]; then
  PUERTO=8020
  while ss -ltn "( sport = :$PUERTO )" | grep -q LISTEN; do PUERTO=$((PUERTO + 1)); done
  CLAVE_ADMIN="$(openssl rand -hex 14)"
  cat > "$ENV_FILE" <<EOF
# Generado por deploy/instalar.sh. No se versiona.
EPI_PUERTO=$PUERTO
EPI_DATA_DIR=$DATOS
EPI_ADMIN_USUARIO=admin
EPI_ADMIN_CLAVE=$CLAVE_ADMIN
EPI_CARPETA_DATOS=
EOF
  chown "$USR:$USR" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  CLAVE_NUEVA=1
else
  PUERTO="$(grep -E '^EPI_PUERTO=' "$ENV_FILE" | cut -d= -f2)"
  CLAVE_ADMIN="(la que ya estaba configurada en $ENV_FILE)"
  CLAVE_NUEVA=0
fi
echo "Puerto interno de la app: $PUERTO (solo escucha en 127.0.0.1)"

cat > /etc/systemd/system/analitica.service <<EOF
[Unit]
Description=Analítica de la Unidad de Discapacidad
After=network.target

[Service]
User=$USR
Group=$USR
WorkingDirectory=$APP/backend
ExecStart=$APP/backend/.venv/bin/python run.py
Restart=on-failure
RestartSec=3
Environment=PYTHONUNBUFFERED=1
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATOS

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable analitica >/dev/null

paso "5/8 Instalando dependencias, compilando la interfaz y arrancando"
bash "$APP/deploy/actualizar.sh" --sin-pull

paso "6/8 Respaldos diarios"
install -m 755 "$APP/deploy/respaldar.sh" /usr/local/sbin/analitica-respaldar
cat > /etc/cron.d/analitica-respaldo <<EOF
# Copia diaria de la base y de las llaves (sin los libros originales). Conserva 14 días.
30 2 * * * $USR /usr/local/sbin/analitica-respaldar >> $RESPALDOS/respaldo.log 2>&1
EOF
chmod 644 /etc/cron.d/analitica-respaldo

paso "7/8 nginx y certificado HTTPS"
cat > /etc/nginx/conf.d/analitica-global.conf <<'EOF'
# Zona de límite de intentos de inicio de sesión y formato de registro sin la query
# (la exportación a Excel envía el token en la URL: no debe quedar en los registros).
limit_req_zone $binary_remote_addr zone=analitica_login:10m rate=10r/m;
log_format analitica '$remote_addr - [$time_local] "$request_method $uri" $status $body_bytes_sent "$http_user_agent"';
EOF

install -d /etc/nginx/snippets
sed "s/__PUERTO__/$PUERTO/g" > /etc/nginx/snippets/analitica-proxy.conf <<'EOF'
proxy_pass http://127.0.0.1:__PUERTO__;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
EOF

# Si algo falla al probar la configuración, deja nginx como estaba.
[ -f "$SITIO" ] && cp "$SITIO" "$SITIO.bak" || true
deshacer_nginx() {
  if [ -f "$SITIO.bak" ]; then mv "$SITIO.bak" "$SITIO"; else rm -f "$SITIO" /etc/nginx/sites-enabled/analitica; fi
  die "nginx rechazó la configuración y se restauró el estado anterior. Revisa: nginx -t"
}

if [ ! -d "/etc/letsencrypt/live/$DOMINIO" ]; then
  # Primero un sitio mínimo que solo responde al desafío de Let's Encrypt.
  sed "s/__DOMINIO__/$DOMINIO/g" > "$SITIO" <<'EOF'
server {
    listen 80;
    server_name __DOMINIO__;
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 404; }
}
EOF
  ln -sf "$SITIO" /etc/nginx/sites-enabled/analitica
  nginx -t || deshacer_nginx
  systemctl reload nginx
  certbot certonly --webroot -w "$WEBROOT" -d "$DOMINIO" -m "$CORREO" --agree-tos --no-eff-email -n \
    || die "No se pudo emitir el certificado. Verifica el DNS y que el puerto 80 sea accesible desde internet."
fi

sed -e "s/__DOMINIO__/$DOMINIO/g" > "$SITIO" <<'EOF'
server {
    listen 80;
    server_name __DOMINIO__;
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name __DOMINIO__;

    ssl_certificate     /etc/letsencrypt/live/__DOMINIO__/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/__DOMINIO__/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:analitica_ssl:5m;
    ssl_session_timeout 1h;

    access_log /var/log/nginx/analitica.access.log analitica;
    error_log  /var/log/nginx/analitica.error.log;

    client_max_body_size 120m;   # libros mensuales .xlsm

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "same-origin" always;

    # La documentación interactiva de la API no se expone en internet.
    location ~ ^/api/(docs|redoc|openapi\.json) { return 404; }

    # «Leer ruta» lee archivos del disco del servidor: aquí los libros se suben desde el navegador.
    location = /api/cortes/ruta { return 404; }

    # Límite de intentos de inicio de sesión (10 por minuto por IP, con ráfaga de 5).
    location = /api/auth/login {
        limit_req zone=analitica_login burst=5 nodelay;
        limit_req_status 429;
        include /etc/nginx/snippets/analitica-proxy.conf;
    }

    location / {
        include /etc/nginx/snippets/analitica-proxy.conf;
    }
}
EOF
ln -sf "$SITIO" /etc/nginx/sites-enabled/analitica
nginx -t || deshacer_nginx
systemctl reload nginx
rm -f "$SITIO.bak"

# Renovación automática del certificado y recarga de nginx al renovar.
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/recargar-nginx.sh
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/recargar-nginx.sh
systemctl enable --now certbot.timer >/dev/null 2>&1 || true

paso "8/8 Verificación"
curl -fsS --max-time 15 --resolve "$DOMINIO:443:127.0.0.1" "https://$DOMINIO/api/salud" >/dev/null \
  && echo "OK: https://$DOMINIO responde." || die "El sitio no responde por HTTPS. Revisa: journalctl -u analitica -n 50"

echo
echo "=========================================================="
echo " Listo: https://$DOMINIO"
if [ "$CLAVE_NUEVA" = "1" ]; then
  echo " Usuario:  admin"
  echo " Clave:    $CLAVE_ADMIN"
  echo " (se muestra solo ahora; también está en $ENV_FILE)"
  echo " Entra, cambia la clave desde tu cuenta y crea los usuarios del equipo."
else
  echo " La clave del administrador no cambió (ver $ENV_FILE)."
fi
echo " Datos y llaves:   $DATOS   (haz copia de esa carpeta fuera del servidor)"
echo " Respaldos diarios: $RESPALDOS"
echo " Actualizar:        sudo bash $APP/deploy/actualizar.sh"
echo "=========================================================="
