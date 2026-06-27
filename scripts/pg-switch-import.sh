#!/usr/bin/env bash
# One-off: point the app at PostgreSQL, create the schema, and import the JSON
# dump produced by export-sqlite-json.mjs. Run AFTER pg-setup.sh and AFTER the
# SQLite export, with all pm2 services stopped.
set -euo pipefail

cd /opt/proxy-platform
PGPASS="$(cat /root/pg-pass.txt)"
PGURL="postgresql://proxy:${PGPASS}@127.0.0.1:5432/proxy_platform"

# Back up the current (sqlite) .env so we can roll back.
cp -av .env /root/pgbak-0620/.env.sqlite.bak

# Repoint the datasource to Postgres.
sed -i 's#^DATABASE_PROVIDER=.*#DATABASE_PROVIDER=postgresql#' .env
sed -i "s#^DATABASE_URL=.*#DATABASE_URL=${PGURL}#" .env
echo '--- .env datasource (password masked) ---'
grep -E '^DATABASE_(PROVIDER|URL)=' .env | sed -E 's#(://[^:]+:)[^@]+@#\1***@#'

export DATABASE_PROVIDER=postgresql
export DATABASE_URL="${PGURL}"

# Rewrite schema provider -> postgresql, regenerate client, create tables.
npm run prisma:generate -w @proxy-platform/db
npm run prisma:push -w @proxy-platform/db

# Import the data dumped from SQLite.
DUMP_FILE=/root/migrate-dump.json DATABASE_URL="${PGURL}" node scripts/import-json-pg.mjs

echo '--- PostgreSQL row counts ---'
sudo -u postgres psql -d proxy_platform -c "SELECT 'users' t,count(*) c FROM users UNION ALL SELECT 'upstream_proxies',count(*) FROM upstream_proxies UNION ALL SELECT 'proxy_entries',count(*) FROM proxy_entries UNION ALL SELECT 'traffic_daily',count(*) FROM traffic_daily UNION ALL SELECT 'scan_logs',count(*) FROM scan_logs UNION ALL SELECT 'operation_logs',count(*) FROM operation_logs UNION ALL SELECT 'ip_geo_cache',count(*) FROM ip_geo_cache ORDER BY t;"

echo "SWITCH_IMPORT_OK"
