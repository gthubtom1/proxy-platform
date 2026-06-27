#!/usr/bin/env bash
# Diagnostic ONLY: create a temporary US proxy entry via the admin API, send a
# small request (ipinfo) and a large one (google) through the local gateway to
# see whether the gateway->upstream->target path works, then delete the entry.
set -uo pipefail
cd /opt/proxy-platform
API=http://127.0.0.1:3110

AU="$(grep -E '^ADMIN_USERNAME=' .env | head -1 | cut -d= -f2-)"
AP="$(grep -E '^ADMIN_PASSWORD=' .env | head -1 | cut -d= -f2-)"
echo "admin_user=${AU}"

jget() { node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);let v=j;for(const k of process.argv[1].split(".")){if(v==null)break;v=v[k];}process.stdout.write(v==null?"":String(v));}catch(e){process.stdout.write("");}})' "$1"; }

login="$(curl -s -X POST "$API/api/admin/login" -H 'Content-Type: application/json' --data-raw "{\"username\":\"${AU}\",\"password\":\"${AP}\"}")"
TOKEN="$(printf '%s' "$login" | jget token)"
echo "token_len=${#TOKEN}"
if [ -z "$TOKEN" ]; then echo "LOGIN_FAILED=${login}"; exit 1; fi

users="$(curl -s "$API/api/admin/users" -H "Authorization: Bearer ${TOKEN}")"
UID2="$(printf '%s' "$users" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const a=j.users||j;const u=a.find(x=>x.role==="user")||a[0];process.stdout.write(String((u&&u.id)||""));}catch(e){process.stdout.write("");}})')"
echo "user_id=${UID2}"

create="$(curl -s -X POST "$API/api/admin/proxy-entries" -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' --data-raw "{\"userId\":${UID2},\"targetCountry\":\"US\"}")"
echo "create_keys=$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{console.log(JSON.stringify(JSON.parse(d),(k,v)=>k.toLowerCase().includes("password")?"<redacted>":v).slice(0,600));}catch(e){console.log("PARSE_ERR:"+d.slice(0,300));}})')"
PU="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const e=j.proxyEntry||j.entry||j;process.stdout.write(e.username||"");}catch(e){process.stdout.write("");}})')"
PP="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.password||j.proxyPassword||j.initialPassword||(j.clientProxy&&j.clientProxy.password)||"");}catch(e){process.stdout.write("");}})')"
PID="$(printf '%s' "$create" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const e=j.proxyEntry||j.entry||j;process.stdout.write(String(e.id||""));}catch(e){process.stdout.write("");}})')"
echo "entry_id=${PID} entry_user=${PU} pass_len=${#PP}"

if [ -n "$PP" ]; then
  PX="http://${PU}:${PP}@127.0.0.1:18001"
  echo "=== gateway -> ipinfo (small) ==="
  curl -s -o /dev/null -w 'ipinfo: code=%{http_code} t=%{time_total}s\n' --max-time 30 -x "$PX" https://ipinfo.io/json
  echo "=== gateway -> exit ip ==="
  echo "exit_ip=$(curl -s --max-time 30 -x "$PX" https://ipinfo.io/ip)"
  echo "=== gateway -> google (large) ==="
  curl -s -o /dev/null -w 'google: code=%{http_code} t=%{time_total}s\n' --max-time 30 -x "$PX" https://www.google.com
  echo "=== gateway -> example.com ==="
  curl -s -o /dev/null -w 'example: code=%{http_code} t=%{time_total}s\n' --max-time 30 -x "$PX" https://example.com
fi

if [ -n "$PID" ]; then
  curl -s -X DELETE "$API/api/admin/proxy-entries/${PID}" -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' --data-raw '{"confirm":true}' -o /dev/null -w 'cleanup_delete: code=%{http_code}\n'
fi
echo "GW_TEST_DONE"
