#!/usr/bin/env bash
# Diagnostic: measure DOWNLOAD bandwidth through the gateway+upstream FROM the VPS
# itself (no client->VPS hop). Isolates "upstream is slow" vs "client->VPS hop is
# slow". Creates a temporary US entry, downloads ~10MB via the gateway, prints
# MB/s, then deletes the entry.
set -uo pipefail
cd /opt/proxy-platform
API=http://127.0.0.1:3110

AU="$(grep -E '^ADMIN_USERNAME=' .env | head -1 | cut -d= -f2-)"
AP="$(grep -E '^ADMIN_PASSWORD=' .env | head -1 | cut -d= -f2-)"
jget(){ node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);let v=j;for(const k of process.argv[1].split(".")){if(v==null)break;v=v[k];}process.stdout.write(v==null?"":String(v));}catch(e){process.stdout.write("");}})' "$1"; }

TOKEN="$(curl -s -X POST "$API/api/admin/login" -H 'Content-Type: application/json' --data-raw "{\"username\":\"${AU}\",\"password\":\"${AP}\"}" | jget token)"
if [ -z "$TOKEN" ]; then echo LOGIN_FAILED; exit 1; fi
UID2="$(curl -s "$API/api/admin/users" -H "Authorization: Bearer ${TOKEN}" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const a=j.users||j;const u=a.find(x=>x.role==="user")||a[0];process.stdout.write(String((u&&u.id)||""));}catch(e){process.stdout.write("");}})')"
create="$(curl -s -X POST "$API/api/admin/proxy-entries" -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' --data-raw "{\"userId\":${UID2},\"targetCountry\":\"US\"}")"
PU="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const e=j.proxyEntry||j;process.stdout.write(e.username||"");}catch(e){process.stdout.write("");}})')"
PP="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.password||(j.clientProxy&&j.clientProxy.password)||"");}catch(e){process.stdout.write("");}})')"
PID="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const e=j.proxyEntry||j;process.stdout.write(String(e.id||""));}catch(e){process.stdout.write("");}})')"
EXIP="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const e=j.proxyEntry||j;process.stdout.write(e.currentIp||"");}catch(e){process.stdout.write("");}})')"
echo "entry_id=${PID} exit_ip=${EXIP}"

if [ -n "$PP" ]; then
  PX="http://${PU}:${PP}@127.0.0.1:18001"
  echo "--- download 10MB via upstream (cloudflare) ---"
  curl -s -o /dev/null -w 'via_upstream: %{speed_download} B/s  size=%{size_download}  t=%{time_total}s\n' --max-time 60 -x "$PX" "https://speed.cloudflare.com/__down?bytes=10000000"
  echo "--- download 10MB DIRECT from VPS (no proxy, baseline) ---"
  curl -s -o /dev/null -w 'vps_direct: %{speed_download} B/s  size=%{size_download}  t=%{time_total}s\n' --max-time 60 "https://speed.cloudflare.com/__down?bytes=10000000"
fi

if [ -n "$PID" ]; then
  curl -s -X DELETE "$API/api/admin/proxy-entries/${PID}" -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' --data-raw '{"confirm":true}' -o /dev/null -w 'cleanup=%{http_code}\n'
fi
echo BW_TEST_DONE
