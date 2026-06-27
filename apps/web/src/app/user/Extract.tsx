import { useEffect, useMemo, useState, type FormEvent } from "react";
import { COUNTRY_OPTIONS, type CountryOption, type IpInfo, type User } from "../types";
import { ApiError, userApi } from "../api";
import { formatBytes } from "../format";
import { Button, Card, CopyButton, DataTable, Field, MessageBar, TablePager, copyTextToClipboard, usePaged } from "../ui";

const HARD_MAX = 50;

type GradeOption = { value: string; label: string; hint: string };

// Extraction grades, mutually exclusive, grouped by line. Residential offers 4
// (clean static / clean quasi / clean dynamic / proxy-flagged); datacenter 2
// (static / dynamic). Values match shared EXTRACT_GRADE_* and the API `grade`.
const RESI_GRADES: GradeOption[] = [
  {
    value: "resi_premium",
    label: "高级纯净住宅（问卷首选）",
    hint: "IP 固定 + 未被标记为代理，最不易被风控识别，问卷/登录强烈推荐。库存最多。"
  },
  {
    value: "resi_normal",
    label: "普通纯净住宅",
    hint: "IP 较固定 + 未被标记为代理。稳定性次于高级纯净，性价比之选。"
  },
  {
    value: "resi_dynamic",
    label: "动态住宅",
    hint: "住宅 IP 但变动较快、量大。一般爬取用，问卷不推荐。"
  },
  {
    value: "proxy_flagged",
    label: "代理标记IP（慎用）",
    hint: "已被识别为代理的 IP（含原静态ISP），问卷易判异常，库存少。固定的排在前面。"
  }
];
const DC_GRADES: GradeOption[] = [
  { value: "dc_static", label: "稳定机房", hint: "机房 IP 中相对固定的。速度快，但机房 IP 易被识别。" },
  { value: "dc_dynamic", label: "动态机房", hint: "机房 IP 且变动较快。速度快、量大，易被识别。" }
];

type ResultItem = {
  proxyEntryId?: number;
  copyText: string;
  ipInfo: IpInfo | null;
  replaced?: boolean;
  // ISO start of the bound upstream's continuous-stable streak at extraction time
  // (snapshot). null = not in a static streak. Shown in the "时间" column.
  stableSince?: string | null;
};

type ResultFilter = "all" | "res" | "dc";

function geoLine(info: IpInfo): string {
  return [info.city, info.region, info.country].filter(Boolean).join(" · ");
}

// "Continuously-stable for how long" at the moment of extraction (snapshot). A
// longer streak = a more trusted, less-rotating exit. "—" when not in a static
// streak (dynamic / proxy grades, where there is no streak to show).
function stableDurationText(stableSince: string | null | undefined): string {
  if (!stableSince) return "—";
  const start = new Date(stableSince).getTime();
  if (Number.isNaN(start)) return "—";
  const mins = Math.max(0, Math.floor((Date.now() - start) / 60000));
  if (mins < 60) return `${mins}分钟`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)}时${mins % 60}分`;
  return `${Math.floor(mins / 1440)}天${Math.floor((mins % 1440) / 60)}时`;
}

// A proxy is flagged "datacenter" only when ip-api positively reports hosting.
// Unknown (null) hosting counts as residential so it is not hidden behind the
// "机房" filter and the residential + datacenter counts always sum to the total.
function isDatacenter(item: ResultItem): boolean {
  return item.ipInfo?.hosting === true;
}

type LocationCountry = { country: string; regions: { region: string; cities: string[] }[] };

export function UserExtract(props: { user: User; onCreated: () => void }) {
  const countryOptions = useMemo<CountryOption[]>(() => {
    const allowed = props.user.allowedCountries;
    if (allowed.length === 0) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((option) => allowed.includes(option.value));
  }, [props.user.allowedCountries]);

  const [locations, setLocations] = useState<LocationCountry[]>([]);
  // Line type: residential (default) draws from the residential pool; datacenter
  // draws only from machine-room (hosting) upstreams. Reloads location options to
  // match, since the two pools can cover different countries/cities.
  const [ipType, setIpType] = useState<"residential" | "hosting">("residential");
  // Extraction grade within the selected line. Switching line resets to that
  // line's first grade. The grade alone drives matching + which geos are offered.
  const [grade, setGrade] = useState<string>(RESI_GRADES[0].value);

  useEffect(() => {
    let cancelled = false;
    userApi
      .locations(undefined, undefined, grade)
      .then((result) => {
        if (!cancelled) setLocations(result.countries);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [grade]);

  const maxCount = HARD_MAX;

  // Remaining quota for the currently selected line type. Residential and hosting
  // are metered against separate buckets, so the hint reflects whichever applies.
  const selectedQuota =
    ipType === "hosting" ? Number(props.user.trafficQuotaHostingBytes || 0) : Number(props.user.trafficQuotaBytes || 0);
  const selectedUsed =
    ipType === "hosting" ? Number(props.user.trafficUsedHostingBytes || 0) : Number(props.user.trafficUsedBytes || 0);
  const selectedRemainingText = selectedQuota <= 0 ? "不限" : formatBytes(Math.max(0, selectedQuota - selectedUsed));

  const [country, setCountry] = useState(() => countryOptions[0]?.value ?? "");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");

  const regionOptions = useMemo(() => {
    const match = locations.find((item) => item.country === country);
    return match ? match.regions : [];
  }, [locations, country]);

  const cityOptions = useMemo(() => {
    const match = regionOptions.find((item) => item.region === region);
    return match ? match.cities : [];
  }, [regionOptions, region]);

  // Reset region/city when they are no longer valid for the current country/region
  // (e.g. after switching country) so the form never submits a stale location.
  useEffect(() => {
    if (region && !regionOptions.some((item) => item.region === region)) {
      setRegion("");
      setCity("");
    }
  }, [regionOptions, region]);

  useEffect(() => {
    if (city && !cityOptions.includes(city)) {
      setCity("");
    }
  }, [cityOptions, city]);
  const [password, setPassword] = useState("");
  const [count, setCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);

  // Result-table interaction state.
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [regenerating, setRegenerating] = useState<Set<number>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);

  const requestedCount = Math.max(1, Math.min(maxCount, Number(count) || 1));

  const total = results.length;
  const dcCount = useMemo(() => results.filter(isDatacenter).length, [results]);
  const resCount = total - dcCount;
  const manualCopyText = useMemo(() => results.map((item) => item.copyText).join("\n"), [results]);

  // Keep the original index alongside each row so filtering/paging never loses the
  // reference needed to update or regenerate the right entry.
  const rows = useMemo(() => results.map((item, index) => ({ item, index })), [results]);
  const visibleRows = useMemo(() => {
    if (filter === "res") return rows.filter((row) => !isDatacenter(row.item));
    if (filter === "dc") return rows.filter((row) => isDatacenter(row.item));
    return rows;
  }, [rows, filter]);

  const paged = usePaged(visibleRows, 10);
  const pageRows = paged.pageItems as { item: ResultItem; index: number }[];
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.index));

  function resetResultState(items: ResultItem[]) {
    setResults(items);
    setFilter("all");
    setSelected(new Set());
    setRegenerating(new Set());
  }

  function toggleRow(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((row) => next.delete(row.index));
      else pageRows.forEach((row) => next.add(row.index));
      return next;
    });
  }

  function selectAllDatacenter() {
    const next = new Set<number>();
    results.forEach((item, index) => {
      if (isDatacenter(item)) next.add(index);
    });
    setSelected(next);
    setFilter("dc");
  }

  async function copyToClipboard(text: string, message: string) {
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setNotice(message);
    } else {
      setError("复制失败，请手动选中复制。");
    }
  }

  function copyAll() {
    void copyToClipboard(results.map((item) => item.copyText).join("\n"), `已复制全部 ${results.length} 条到剪贴板。`);
  }

  function copySelected() {
    const lines = results.filter((_, index) => selected.has(index)).map((item) => item.copyText);
    void copyToClipboard(lines.join("\n"), `已复制选中 ${lines.length} 条到剪贴板。`);
  }

  async function regenerateOne(index: number): Promise<{ ok: boolean; toResidential: boolean }> {
    const item = results[index];
    if (!item?.proxyEntryId) return { ok: false, toResidential: false };

    setRegenerating((prev) => new Set(prev).add(index));
    try {
      const response = await userApi.regenerateProxyEntry(item.proxyEntryId);
      setResults((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, ipInfo: response.ipInfo, stableSince: response.stableSince ?? null, replaced: true } : it
        )
      );
      return { ok: true, toResidential: response.ipInfo ? response.ipInfo.hosting !== true : false };
    } catch (err) {
      // Surface the first failure reason; "no other upstream" keeps the original IP.
      setError(err instanceof ApiError ? err.message : "更换失败，请稍后再试。");
      return { ok: false, toResidential: false };
    } finally {
      setRegenerating((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  async function handleRegenerateOne(index: number) {
    setError(null);
    setNotice(null);
    const result = await regenerateOne(index);
    if (result.ok) {
      setNotice(`已换 1 个，其中 ${result.toResidential ? 1 : 0} 个换到住宅。`);
    }
  }

  async function regenerateSelected() {
    const indices = [...selected];
    if (indices.length === 0) return;

    setBulkRunning(true);
    setError(null);
    setNotice(null);
    let done = 0;
    let toResidential = 0;
    let failed = 0;
    // Sequential on purpose: each call hits ip-api + a DB transaction, so a serial
    // loop avoids hammering the upstream lookup and keeps the summary deterministic.
    for (const index of indices) {
      const result = await regenerateOne(index);
      if (result.ok) {
        done += 1;
        if (result.toResidential) toResidential += 1;
      } else {
        failed += 1;
      }
    }
    setSelected(new Set());
    setBulkRunning(false);
    setNotice(`已换 ${done} 个，其中 ${toResidential} 个换到住宅${failed ? `，${failed} 个未成功` : ""}。`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!country) {
      setError("请先选择国家。");
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const payload = {
      targetCountry: country,
      targetRegion: region.trim() || undefined,
      targetCity: city.trim() || undefined,
      grade,
      proxyPassword: password.trim() || undefined
    };

    let items: ResultItem[] = [];
    let failure: string | null = null;

    try {
      if (requestedCount > 1) {
        // Atomic batch: all N or nothing, so there is never a half-finished result.
        const response = await userApi.createProxyEntriesBatch({ count: requestedCount, ...payload });
        items = response.clientProxies.map((item) => ({
          proxyEntryId: item.proxyEntryId,
          copyText: item.copyText,
          ipInfo: item.ipInfo ?? null,
          stableSince: item.stableSince ?? null
        }));
      } else {
        const response = await userApi.createProxyEntry(payload);
        items = [
          {
            proxyEntryId: response.clientProxy.proxyEntryId,
            copyText: response.clientProxy.copyText,
            ipInfo: response.clientProxy.ipInfo ?? null,
            stableSince: response.clientProxy.stableSince ?? null
          }
        ];
      }
    } catch (err) {
      failure = err instanceof ApiError ? err.message : "提取过程中出错，请稍后再试。";
    }

    if (items.length > 0) {
      resetResultState(items);
      props.onCreated();
      setNotice(`成功生成 ${items.length} 条代理，密码只显示这一次，请立即复制保存。`);
      setPassword("");
    } else {
      setError(failure ?? "提取失败，请稍后再试。");
    }

    setSubmitting(false);
  }

  return (
    <div className="page page-wide">
      <Card title="提取代理" subtitle="选择国家与数量生成代理，地区 / 城市可留空。">
        {countryOptions.length === 0 ? (
          <MessageBar tone="error" text="你的账号暂未开通任何国家，请联系管理员。" />
        ) : (
          <form onSubmit={submit}>
            {error ? (
              <div className="extract-form-message">
                <MessageBar tone="error" text={error} onDismiss={() => setError(null)} />
              </div>
            ) : null}

            <div className="extract-form-row">
              <Field
                label="线路类型"
                hint={`住宅=家庭IP（问卷推荐）；机房=数据中心IP，速度快但易被识别。当前线路剩余额度：${selectedRemainingText}`}
              >
                <select
                  value={ipType}
                  onChange={(event) => {
                    const next = event.target.value === "hosting" ? "hosting" : "residential";
                    setIpType(next);
                    setGrade((next === "hosting" ? DC_GRADES : RESI_GRADES)[0].value);
                  }}
                >
                  <option value="residential">住宅</option>
                  <option value="hosting">机房</option>
                </select>
              </Field>
              <Field
                label="用途档"
                hint={(ipType === "hosting" ? DC_GRADES : RESI_GRADES).find((g) => g.value === grade)?.hint ?? ""}
              >
                <select value={grade} onChange={(event) => setGrade(event.target.value)}>
                  {(ipType === "hosting" ? DC_GRADES : RESI_GRADES).map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="国家">
                <select value={country} onChange={(event) => setCountry(event.target.value)}>
                  {countryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="地区（可选）"
                hint={regionOptions.length > 0 ? "只列出该国家当前有可用上游的地区。" : "该国家暂无可细分地区，保持不限即可。"}
              >
                <select
                  value={region}
                  disabled={regionOptions.length === 0}
                  onChange={(event) => {
                    setRegion(event.target.value);
                    setCity("");
                  }}
                >
                  <option value="">不限</option>
                  {regionOptions.map((item) => (
                    <option key={item.region} value={item.region}>
                      {item.region}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="城市（可选）"
                hint={!region ? "先选地区再选城市。" : cityOptions.length > 0 ? "只列出该地区可用的城市。" : "该地区暂无可细分城市。"}
              >
                <select
                  value={city}
                  disabled={!region || cityOptions.length === 0}
                  onChange={(event) => setCity(event.target.value)}
                >
                  <option value="">不限</option>
                  {cityOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="数量" hint={`最多 ${maxCount} 条`}>
                <input
                  type="number"
                  min="1"
                  max={maxCount}
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  onBlur={() => setCount(String(requestedCount))}
                />
              </Field>
              <Field label="自定义密码（可选）" hint="留空自动生成。">
                <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="自动生成" />
              </Field>
              <div className="extract-form-submit">
                <Button type="submit" variant="primary" loading={submitting}>
                  生成 {requestedCount} 条代理
                </Button>
              </div>
            </div>
          </form>
        )}
      </Card>

      <Card
        title="生成结果"
        subtitle={
          total > 0
            ? "在指纹浏览器里把时区/地区设成下面一致；机房 IP 可点「换一个」换成住宅。"
            : "生成后这里以表格列出每条代理，可筛选机房并逐条 / 批量更换 IP。"
        }
        actions={total > 0 ? <Button size="sm" onClick={copyAll}>复制全部</Button> : undefined}
      >
        {notice ? (
          <div className="extract-notice">
            <MessageBar tone="success" text={notice} onDismiss={() => setNotice(null)} />
          </div>
        ) : null}

        {total === 0 ? (
          <p className="muted-text">还没有生成结果。选择国家与数量后点「生成」。</p>
        ) : (
          <>
            <div className="status-cards">
              <button
                type="button"
                className={`status-card status-card-slate${filter === "all" ? " is-active" : ""}`}
                onClick={() => setFilter("all")}
              >
                <span className="status-card-count">{total}</span>
                <span className="status-card-label">全部</span>
              </button>
              <button
                type="button"
                className={`status-card status-card-green${filter === "res" ? " is-active" : ""}`}
                onClick={() => setFilter("res")}
              >
                <span className="status-card-count">{resCount}</span>
                <span className="status-card-label">住宅</span>
              </button>
              <button
                type="button"
                className={`status-card status-card-red${filter === "dc" ? " is-active" : ""}`}
                onClick={() => setFilter("dc")}
              >
                <span className="status-card-count">{dcCount}</span>
                <span className="status-card-label">机房（建议换）</span>
              </button>
            </div>

            {selected.size > 0 ? (
              <div className="bulk-bar">
                <span className="bulk-bar-text">已选 {selected.size} 条</span>
                <Button size="sm" onClick={selectAllDatacenter} disabled={bulkRunning || dcCount === 0}>
                  一键选中所有机房
                </Button>
                <Button size="sm" onClick={copySelected} disabled={bulkRunning}>
                  复制选中
                </Button>
                <Button size="sm" variant="primary" loading={bulkRunning} onClick={regenerateSelected}>
                  换选中的 IP
                </Button>
              </div>
            ) : null}

            <textarea
              aria-label="完整代理串"
              className="extract-manual-copy"
              readOnly
              value={manualCopyText}
              onFocus={(event) => event.currentTarget.select()}
            />

            <DataTable minWidth={860}>
              <thead>
                <tr>
                  <th className="col-check">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePage}
                      aria-label="选择本页全部"
                    />
                  </th>
                  <th className="num">#</th>
                  <th>出口 IP</th>
                  <th>地区</th>
                  <th>时区</th>
                  <th>质量</th>
                  <th>时间</th>
                  <th>代理串</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(({ item, index }) => {
                  const info = item.ipInfo;
                  const datacenter = isDatacenter(item);
                  const busy = regenerating.has(index);
                  return (
                    <tr key={item.proxyEntryId ?? index} className={datacenter ? "is-datacenter" : undefined}>
                      <td className="col-check">
                        <input
                          type="checkbox"
                          checked={selected.has(index)}
                          onChange={() => toggleRow(index)}
                          aria-label={`选择第 ${index + 1} 条`}
                        />
                      </td>
                      <td className="num">{index + 1}</td>
                      <td>
                        <span className="extract-cell-ip">{info?.ip ?? "—"}</span>
                        {item.replaced ? <span className="row-tag tone-good">已换</span> : null}
                      </td>
                      <td>{info && geoLine(info) ? geoLine(info) : "未知"}</td>
                      <td className="extract-cell-tz">{info?.timezone ?? "未知"}</td>
                      <td>
                        <span className="ipbadge-group">
                          {info?.hosting === false ? (
                            <span className="ipbadge good">住宅</span>
                          ) : info?.hosting === true ? (
                            <span className="ipbadge warn">机房</span>
                          ) : null}
                          {info?.proxy === true ? (
                            <span className="ipbadge bad">疑似代理</span>
                          ) : info?.proxy === false ? (
                            <span className="ipbadge good">未标记代理</span>
                          ) : null}
                          {info?.mobile === true ? <span className="ipbadge">移动网络</span> : null}
                          {!info ? <span className="ipbadge">未知</span> : null}
                        </span>
                      </td>
                      <td className="extract-cell-tz" title="已连续稳定时长（提取那一刻的快照）">
                        {stableDurationText(item.stableSince)}
                      </td>
                      <td>
                        <span className="extract-cell-str" title={item.copyText}>
                          {item.copyText}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <CopyButton value={item.copyText} size="sm" />
                          <Button
                            size="sm"
                            loading={busy}
                            disabled={bulkRunning || !item.proxyEntryId}
                            onClick={() => handleRegenerateOne(index)}
                          >
                            换一个 IP
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <p className="muted-text" style={{ textAlign: "center", padding: "16px 0" }}>
                        该筛选下没有代理。
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </DataTable>

            <TablePager paged={paged} />
          </>
        )}
      </Card>
    </div>
  );
}
