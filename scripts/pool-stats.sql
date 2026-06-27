SELECT pe.id AS entry_id, pe.username, pe.current_upstream_id, up.host, up.current_ip, up.latency_ms, up.status, up.country, up.region, up.city
FROM proxy_entries pe LEFT JOIN upstream_proxies up ON pe.current_upstream_id = up.id;

SELECT status, count(*) AS n, round(avg(latency_ms)) AS avg_ms, min(latency_ms) AS min_ms, max(latency_ms) AS max_ms
FROM upstream_proxies GROUP BY status ORDER BY n DESC;

SELECT count(*) AS us_free_total,
       count(*) FILTER (WHERE latency_ms < 800) AS us_free_under_800ms,
       count(*) FILTER (WHERE latency_ms < 1500) AS us_free_under_1500ms
FROM upstream_proxies WHERE status = 'free' AND country = 'us';

SELECT id, host, current_ip, latency_ms, region, city
FROM upstream_proxies WHERE status = 'free' AND country = 'us' ORDER BY latency_ms ASC NULLS LAST LIMIT 8;
