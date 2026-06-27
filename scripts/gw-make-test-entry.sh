#!/usr/bin/env bash
# Diagnostic: create a US proxy entry, verify server-side it can fetch amazon +
# google through the gateway, and print the client proxy string so the owner can
# reproduce from their own machine. Does NOT delete the entry (caller cleans up).
set -uo pipefail
cd /opt/proxy-platform
API=http://127.0.0.1:3110

AU="$(grep -E '^ADMIN_USERNAME=' .env | head -1 | cut -d= -f2-)"
AP="$(grep -E '^ADMIN_PASSWORD=' .env | head -1 | cut -d= -f2-)"
jget() { node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);let v=j;for(const k of process.argv[1].split(".")){if(v==null)break;v=v[k];}process.stdout.write(v==null?"":String(v));}catch(e){process.stdout.write("");}})' "$1"; }

login="$(curl -s -X POST "$API/api/admin/login" -H 'Content-Type: application/json' --data-raw "{\"username\":\"${AU}\",\"password\":\"${AP}\"}")"
TOKEN="$(printf '%s' "$login" | jget token)"
if [ -z "$TOKEN" ]; then echo "LOGIN_FAILED=${login}"; exit 1; fi

users="$(curl -s "$API/api/admin/users" -H "Authorization: Bearer ${TOKEN}")"
UID2="$(printf '%s' "$users" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const a=j.users||j;const u=a.find(x=>x.role==="user")||a[0];process.stdout.write(String((u&&u.id)||""));}catch(e){process.stdout.write("");}})')"

create="$(curl -s -X POST "$API/api/admin/proxy-entries" -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' --data-raw "{\"userId\":${UID2},\"targetCountry\":\"US\"}")"
PU="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const e=j.proxyEntry||j;process.stdout.write(e.username||"");}catch(e){process.stdout.write("");}})')"
PP="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.password||j.proxyPassword||(j.clientProxy&&j.clientProxy.password)||"");}catch(e){process.stdout.write("");}})')"
PID="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const e=j.proxyEntry||j;process.stdout.write(String(e.id||""));}catch(e){process.stdout.write("");}})')"
HOST="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write((j.clientProxy&&j.clientProxy.host)||"");}catch(e){process.stdout.write("");}})')"
PORT="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(String((j.clientProxy&&j.clientProxy.port)||"18001"));}catch(e){process.stdout.write("18001");}})')"

echo "ENTRY_ID=${PID}"
echo "CLIENT_PROXY=${HOST}:${PORT}:${PU}:${PP}"

if [ -n "$PP" ]; then
  PX="http://${PU}:${PP}@127.0.0.1:18001"
  curl -s -o /dev/null -w 'server_ipinfo: code=%{http_code} t=%{time_total}s\n' --max-time 30 -x "$PX" https://ipinfo.io/json
  curl -s -o /dev/null -w 'server_amazon: code=%{http_code} t=%{time_total}s\n' --max-time 30 -x "$PX" https://www.amazon.com
  curl -s -o /dev/null -w 'server_google: code=%{http_code} t=%{time_total}s\n' --max-time 30 -x "$PX" https://www.google.com
fi
echo "MAKE_TEST_ENTRY_DONE"
