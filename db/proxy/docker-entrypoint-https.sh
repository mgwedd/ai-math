#!/bin/sh
# LOCAL DOCKER ONLY — generate a self-signed TLS cert for the HTTPS front door
# if one isn't already present, then hand off to nginx's normal entrypoint.
#
# The cert is written to /etc/nginx/certs (a gitignored named volume, so it's
# generated once and reused across restarts, never committed). A self-signed
# cert is deliberate: the local front door doesn't need a trusted CA. Your
# browser will warn once — trust it and continue.
set -e

CERT_DIR=/etc/nginx/certs
DOMAIN=minima.local.astrealabs.com
CRT="$CERT_DIR/$DOMAIN.crt"
KEY="$CERT_DIR/$DOMAIN.key"

mkdir -p "$CERT_DIR"

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  echo "[proxy] generating self-signed cert for $DOMAIN"
  # nginx:alpine doesn't ship openssl; install it on first run.
  command -v openssl >/dev/null 2>&1 || apk add --no-cache openssl >/dev/null
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$KEY" -out "$CRT" \
    -days 825 -subj "/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1" >/dev/null 2>&1
  echo "[proxy] cert ready at $CRT"
else
  echo "[proxy] reusing existing cert at $CRT"
fi

# Hand off to the stock nginx entrypoint (runs conf.d templating + starts nginx).
exec /docker-entrypoint.sh "$@"
