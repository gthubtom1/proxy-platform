#!/usr/bin/env bash
# Fix large-packet blackhole between clients and the gateway by clamping TCP MSS
# (matches the known-good VPS config) and enabling MTU probing. Idempotent and
# persistent across reboots.
set -uo pipefail

add_rule() {
  local chain="$1"
  iptables -t mangle -C "$chain" -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1240 2>/dev/null \
    || iptables -t mangle -A "$chain" -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1240
}

add_rule PREROUTING
add_rule POSTROUTING

sysctl -w net.ipv4.tcp_mtu_probing=1 >/dev/null
echo 'net.ipv4.tcp_mtu_probing=1' > /etc/sysctl.d/99-proxy-mtu.conf

# Persist iptables across reboots.
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent netfilter-persistent >/dev/null 2>&1 || true
mkdir -p /etc/iptables
iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
netfilter-persistent save >/dev/null 2>&1 || true

echo '=== mangle MSS rules ==='
iptables -t mangle -S | grep -i mss || echo NONE
echo '=== mtu probing ==='
sysctl net.ipv4.tcp_mtu_probing
echo MTU_FIX_OK
