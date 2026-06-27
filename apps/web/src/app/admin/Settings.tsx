import { useEffect, useState } from "react";
import type { AppSettings } from "../types";
import { ApiError, adminApi } from "../api";
import { Button, Card, Loading, MessageBar } from "../ui";

type Props = {
  onMessage: (message: { tone: "error" | "success"; text: string }) => void;
};

// Settings are stored in ms / minutes / counts on the backend. The form shows
// friendlier units and converts back on save.
type FormState = {
  scanIntervalMin: string;
  idleReleaseIntervalMin: string;
  idleReleaseMinutes: string;
  minHoldMinutes: string;
  scanTimeoutSec: string;
  geoCacheTtlMin: string;
  scanBatchSize: string;
  scanConcurrency: string;
  maxScanFailures: string;
  cooldownSeconds: string;
  rateLimitedCooldownMin: string;
  lockedScanIntervalMin: string;
  stabilityIntervalMin: string;
  usageProtectMinutes: string;
  ipTypeStaleMin: string;
  stabilityWindowDays: string;
  geoPremiumSharePct: string;
  geoNormalSharePct: string;
  geoMinSamples: string;
};

const DAY_MS = 24 * 60 * 60000;

function toForm(settings: AppSettings): FormState {
  return {
    scanIntervalMin: String(Math.round(settings.scanIntervalMs / 60000)),
    idleReleaseIntervalMin: String(Math.round(settings.idleReleaseIntervalMs / 60000)),
    idleReleaseMinutes: String(settings.idleReleaseMinutes),
    minHoldMinutes: String(settings.minHoldMinutes),
    scanTimeoutSec: String(Math.round(settings.scanTimeoutMs / 1000)),
    geoCacheTtlMin: String(Math.round(settings.geoCacheTtlMs / 60000)),
    scanBatchSize: String(settings.scanBatchSize),
    scanConcurrency: String(settings.scanConcurrency),
    maxScanFailures: String(settings.maxScanFailures),
    cooldownSeconds: String(Math.round(settings.cooldownMs / 1000)),
    rateLimitedCooldownMin: String(Math.round(settings.rateLimitedCooldownMs / 60000)),
    lockedScanIntervalMin: String(Math.round(settings.lockedScanIntervalMs / 60000)),
    stabilityIntervalMin: String(Math.round(settings.stabilityIntervalMs / 60000)),
    usageProtectMinutes: String(settings.usageProtectMinutes),
    ipTypeStaleMin: String(Math.round(settings.ipTypeStaleMs / 60000)),
    stabilityWindowDays: String(Math.round(settings.stabilityWindowMs / DAY_MS)),
    geoPremiumSharePct: String(settings.geoPremiumSharePct),
    geoNormalSharePct: String(settings.geoNormalSharePct),
    geoMinSamples: String(settings.geoMinSamples)
  };
}

function toPayload(form: FormState): Partial<AppSettings> {
  return {
    scanIntervalMs: Math.max(1, Number(form.scanIntervalMin) || 0) * 60000,
    idleReleaseIntervalMs: Math.max(1, Number(form.idleReleaseIntervalMin) || 0) * 60000,
    idleReleaseMinutes: Math.max(0, Number(form.idleReleaseMinutes) || 0),
    minHoldMinutes: Math.max(0, Number(form.minHoldMinutes) || 0),
    scanTimeoutMs: Math.max(1, Number(form.scanTimeoutSec) || 0) * 1000,
    geoCacheTtlMs: Math.max(1, Number(form.geoCacheTtlMin) || 0) * 60000,
    scanBatchSize: Math.max(1, Number(form.scanBatchSize) || 0),
    scanConcurrency: Math.max(1, Number(form.scanConcurrency) || 0),
    maxScanFailures: Math.max(1, Number(form.maxScanFailures) || 0),
    cooldownMs: Math.max(1, Number(form.cooldownSeconds) || 0) * 1000,
    rateLimitedCooldownMs: Math.max(1, Number(form.rateLimitedCooldownMin) || 0) * 60000,
    lockedScanIntervalMs: Math.max(1, Number(form.lockedScanIntervalMin) || 0) * 60000,
    stabilityIntervalMs: Math.max(1, Number(form.stabilityIntervalMin) || 0) * 60000,
    usageProtectMinutes: Math.max(0, Number(form.usageProtectMinutes) || 0),
    ipTypeStaleMs: Math.max(1, Number(form.ipTypeStaleMin) || 0) * 60000,
    stabilityWindowMs: Math.max(1, Number(form.stabilityWindowDays) || 0) * DAY_MS,
    geoPremiumSharePct: Math.max(1, Number(form.geoPremiumSharePct) || 0),
    geoNormalSharePct: Math.max(1, Number(form.geoNormalSharePct) || 0),
    geoMinSamples: Math.max(1, Number(form.geoMinSamples) || 0)
  };
}

export function AdminSettings(props: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runScanNow() {
    setScanning(true);
    setError(null);
    try {
      const result = await adminApi.runScan();
      props.onMessage({ tone: "success", text: result.message });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "触发扫描失败，请稍后再试。");
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    adminApi
      .appSettings()
      .then((result) => {
        if (!cancelled) setForm(toForm(result.settings));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "读取设置失败。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(key: keyof FormState, value: string) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.updateAppSettings(toPayload(form));
      setForm(toForm(result.settings));
      props.onMessage({ tone: "success", text: "设置已保存，最多一个检查周期后自动生效。" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存设置失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="page page-wide">
        <Card title="系统设置">
          <Loading text="读取设置…" />
        </Card>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <div className="settings-intro">
        <div>
          <strong>系统设置</strong>
          <span>调整扫描与上游绑定策略，保存后由后台自动生效，最多一个检查周期后应用，无需重启。</span>
        </div>
      </div>

      {error ? <MessageBar tone="error" text={error} onDismiss={() => setError(null)} /> : null}

      <div className="settings-grid">
        <Card title="扫描设置" subtitle="控制上游可用性检测的频率与强度">
          <div className="settings-fields">
            <SettingRow
              label="自动检测间隔"
              unit="分钟"
              hint="每隔多久扫描一次上游可用性。"
              value={form.scanIntervalMin}
              min={1}
              onChange={(value) => update("scanIntervalMin", value)}
            />
            <SettingRow
              label="扫描超时"
              unit="秒"
              hint="单条上游检测的最长等待时间。"
              value={form.scanTimeoutSec}
              min={1}
              onChange={(value) => update("scanTimeoutSec", value)}
            />
            <SettingRow
              label="扫描批量"
              unit="条"
              hint="每轮最多检测多少条上游。"
              value={form.scanBatchSize}
              min={1}
              onChange={(value) => update("scanBatchSize", value)}
            />
            <SettingRow
              label="并发上限（智能自动调节）"
              unit="个"
              hint="智能限速器会自动调并发：从低起步、平稳则升、被上游供应商限流(HTTP 402)则自动减半。这里设的是它能爬到的最高并发上限（不是开局就冲的固定值）。"
              value={form.scanConcurrency}
              min={1}
              onChange={(value) => update("scanConcurrency", value)}
            />
          </div>
        </Card>

        <Card title="分级 / 数据新鲜度" subtitle="控制扫描数据、地理与级别多久刷新一次；越短越新鲜，在线查询开销略增">
          <div className="settings-fields">
            <SettingRow
              label="快车道扫描间隔"
              unit="分钟"
              hint="正在被使用（已绑定）的上游多久单独重扫一次，让在用代理的出口 IP/地理更快刷新，独立于全池扫描。"
              value={form.lockedScanIntervalMin}
              min={1}
              onChange={(value) => update("lockedScanIntervalMin", value)}
            />
            <SettingRow
              label="稳定性评分间隔"
              unit="分钟"
              hint="后台多久重算一次每条上游的级别 / 稳定分（用下方“地理判定窗口”范围内的检测历史）。"
              value={form.stabilityIntervalMin}
              min={1}
              onChange={(value) => update("stabilityIntervalMin", value)}
            />
            <SettingRow
              label="机房标签新鲜度"
              unit="分钟"
              hint="机房/代理标签超过这么久没被重新确认，且本次只查到 unknown 时，自动降级回住宅（fail-open），让陈旧的“假机房”及时回流。越短机房纠正越快。"
              value={form.ipTypeStaleMin}
              min={5}
              onChange={(value) => update("ipTypeStaleMin", value)}
            />
            <SettingRow
              label="地理缓存时间"
              unit="分钟"
              hint="出口 IP 的地理信息缓存多久，避免频繁查询。越短机房/代理类型纠正越快（本地住宅查询不受影响）。"
              value={form.geoCacheTtlMin}
              min={1}
              onChange={(value) => update("geoCacheTtlMin", value)}
            />
          </div>
        </Card>

        <Card title="地理分级标准（决定高级 / 普通 / 动态）" subtitle="高级=住宅且“近 N 天内某个州占比≥高级阈值”。窗口越短越宽松（货源跨天会换州）；阈值越高越严。改后下一轮评分生效。">
          <div className="settings-fields">
            <SettingRow
              label="地理判定窗口"
              unit="天"
              hint="往回看最近多少天的检测记录来算“主导州占比”。窗口越长越严（跨天换州会被算进来），越短越能反映“最近是否在同一个州”。"
              value={form.stabilityWindowDays}
              min={1}
              onChange={(value) => update("stabilityWindowDays", value)}
            />
            <SettingRow
              label="高级同州占比"
              unit="%"
              hint="窗口内主导州占比达到该百分比才判“高级纯净”。越高越严（如 99 = 几乎全程同一个州）。"
              value={form.geoPremiumSharePct}
              min={50}
              onChange={(value) => update("geoPremiumSharePct", value)}
            />
            <SettingRow
              label="普通同州占比"
              unit="%"
              hint="主导州占比达到该百分比（但未到高级）判“普通纯净”，低于此为“动态住宅”。"
              value={form.geoNormalSharePct}
              min={1}
              onChange={(value) => update("geoNormalSharePct", value)}
            />
            <SettingRow
              label="高级最小样本"
              unit="个"
              hint="窗口内至少有这么多次检测记录，才允许判“高级”，避免新上游样本太少就被误判高级。"
              value={form.geoMinSamples}
              min={1}
              onChange={(value) => update("geoMinSamples", value)}
            />
          </div>
        </Card>

        <Card title="上游绑定 / 解绑策略" subtitle="控制代理与上游的绑定保持与自动释放">
          <div className="settings-fields">
            <SettingRow
              label="闲置解绑时间"
              unit="分钟"
              hint="代理多久没用就把上游释放回空闲池。"
              value={form.idleReleaseMinutes}
              min={1}
              onChange={(value) => update("idleReleaseMinutes", value)}
            />
            <SettingRow
              label="最短持有时间"
              unit="分钟"
              hint="代理创建后至少保留上游多久，避免刚建就被释放。"
              value={form.minHoldMinutes}
              min={0}
              onChange={(value) => update("minHoldMinutes", value)}
            />
            <SettingRow
              label="解绑检查间隔"
              unit="分钟"
              hint="后台每隔多久检查一次有没有该解绑的代理。"
              value={form.idleReleaseIntervalMin}
              min={1}
              onChange={(value) => update("idleReleaseIntervalMin", value)}
            />
            <SettingRow
              label="使用保护窗口"
              unit="分钟"
              hint="上游绑定的代理最后使用后多少分钟内不参与检测，避免检测连接干扰正在/最近使用的代理（0 = 关闭保护）。"
              value={form.usageProtectMinutes}
              min={0}
              onChange={(value) => update("usageProtectMinutes", value)}
            />
          </div>
        </Card>

        <Card title="失效判定 / 重试策略" subtitle="控制上游连续失败多少次进入待核验池，以及重试冷却">
          <div className="settings-fields">
            <SettingRow
              label="判废失败次数"
              unit="次"
              hint="连续失败达到该次数后，上游进入待核验池(bad)，不再自动扫描，等管理员手动核验。"
              value={form.maxScanFailures}
              min={1}
              onChange={(value) => update("maxScanFailures", value)}
            />
            <SettingRow
              label="重试冷却时长"
              unit="秒"
              hint="失败但还没判废的上游，进入重试池(cooldown)，冷却这么久后自动重试。最小 5 秒。"
              value={form.cooldownSeconds}
              min={5}
              onChange={(value) => update("cooldownSeconds", value)}
            />
            <SettingRow
              label="运营商限流(402)退避"
              unit="分钟"
              hint="被上游供应商限流(HTTP 402/429)的上游，单独冷却这么久再重试，避免反复触发限流、撑满重试池。比普通重试冷却长，默认 5 分钟。"
              value={form.rateLimitedCooldownMin}
              min={1}
              onChange={(value) => update("rateLimitedCooldownMin", value)}
            />
          </div>
        </Card>

        <Card title="手动操作" subtitle="不等自动周期，立即触发一轮扫描">
          <div className="settings-fields">
            <div className="setting-row">
              <div className="setting-row-text">
                <span className="setting-row-label">立即扫描一轮</span>
                <span className="setting-row-hint">
                  对所有可扫描上游（不含已停用/已判废）立即检测一次，后台执行，稍后刷新上游页查看结果。
                </span>
              </div>
              <div className="setting-row-input">
                <Button variant="primary" loading={scanning} onClick={runScanNow}>
                  立即扫描
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="settings-bar">
        <span className="muted-text">改动会写入服务器配置文件，并由后台扫描进程在下一轮自动读取。</span>
        <Button variant="primary" loading={saving} onClick={save}>
          保存设置
        </Button>
      </div>
    </div>
  );
}

function SettingRow(props: {
  label: string;
  unit: string;
  hint: string;
  value: string;
  min: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="setting-row">
      <div className="setting-row-text">
        <span className="setting-row-label">{props.label}</span>
        <span className="setting-row-hint">{props.hint}</span>
      </div>
      <div className="setting-row-input">
        <input
          type="number"
          min={props.min}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
        <span className="setting-row-unit">{props.unit}</span>
      </div>
    </div>
  );
}
