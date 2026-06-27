#!/bin/sh
# certbot deploy hook: reload the stunnel HTTPS-proxy after the cert renews so it
# picks up the new fullchain/privkey (stunnel caches the cert in memory).
systemctl restart stunnel-proxy
