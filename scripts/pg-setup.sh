#!/usr/bin/env bash
# One-off: install PostgreSQL on the VPS and create the proxy role + database.
# Idempotent: safe to re-run. Generates a random localhost-only DB password into
# /root/pg-pass.txt (read by pg-switch-import.sh).
set -euo pipefail

if [ ! -f /root/pg-pass.txt ]; then
  openssl rand -hex 16 > /root/pg-pass.txt
fi
PGPASS="$(cat /root/pg-pass.txt)"

apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql
systemctl enable --now postgresql

# Create role if missing, always (re)set its password to the stored one.
if ! sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_roles WHERE rolname='proxy'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER proxy WITH PASSWORD '${PGPASS}';"
fi
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER proxy WITH PASSWORD '${PGPASS}';"

# Create database if missing.
if ! sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_database WHERE datname='proxy_platform'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE proxy_platform OWNER proxy;"
fi

echo "postgres version: $(sudo -u postgres psql -tAc 'SHOW server_version')"
echo "PG_SETUP_OK"
