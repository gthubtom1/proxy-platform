import { Panel } from "./shared";

type SystemConfig = {
  backupStatus?: string | null;
  gatewayPort?: number | null;
  geoCacheTtlMs?: number | null;
  scanBatchSize?: number | null;
  scanConcurrency?: number | null;
  scanIntervalMs?: number | null;
  scanTimeoutMs?: number | null;
  supportedCountries?: string[] | null;
  workerRepeat?: boolean | null;
} | null;

type ProxyParts = {
  host: string;
  password: string;
  port: string;
  username: string;
};

type Props = {
  copyText: (value: string, successMessage: string) => Promise<void>;
  systemConfig: SystemConfig;
};

export function AdminSettings(props: Props) {
  const gatewayAddress = "VPS_IP:18001";
  const proxyTemplate = `${gatewayAddress}:用户名:密码`;
  const proxyParts = parseProxyTemplate(proxyTemplate);
  const config = props.systemConfig;

  return (
    <>
      <section className="action-strip">
        <div>
          <h2>系统设置</h2>
          <p>第一版只读展示关键参数，避免在没有权限、日志和回滚规则前误改系统配置。</p>
        </div>
      </section>

      <Panel title="基础设置">
        <div className="setting-grid">
          <SettingItem label="网关端口" value={String(config?.gatewayPort ?? 18001)} />
          <SettingItem label="支持国家" value={config?.supportedCountries?.join(", ") || "US, GB, FR, CA, AU"} />
          <SettingItem label="扫描间隔" value={config ? formatDuration(config.scanIntervalMs) : "读取中"} />
          <SettingItem label="扫描并发" value={config ? String(config.scanConcurrency ?? "读取中") : "读取中"} />
          <SettingItem label="扫描批次" value={config ? String(config.scanBatchSize ?? "读取中") : "读取中"} />
          <SettingItem label="超时时间" value={config ? formatDuration(config.scanTimeoutMs) : "读取中"} />
          <SettingItem label="地理缓存" value={config ? formatDuration(config.geoCacheTtlMs) : "读取中"} />
          <SettingItem label="循环扫描" value={config ? (config.workerRepeat ? "已开启" : "单次执行") : "读取中"} />
          <SettingItem label="备份状态" value={config?.backupStatus ?? "读取中"} />
        </div>
      </Panel>

      <Panel title="连接信息">
        <CopyGuide passwordText="用户自己的代理密码只在生成代理时显示一次，后台不会长期保存明文。" />

        <div className="copy-list">
          <div className="copy-row">
            <code>{gatewayAddress}</code>
            <button
              type="button"
              onClick={() => void props.copyText(gatewayAddress, "已复制网关地址模板，请按格式填写用户名和密码。")}
            >
              复制网关地址
            </button>
          </div>

          <div className="copy-row">
            <div className="copy-content">
              <code>{proxyTemplate}</code>
              {proxyParts ? (
                <div className="copy-meta">
                  <span>
                    <strong>主机</strong>
                    <code>{proxyParts.host}</code>
                  </span>
                  <span>
                    <strong>端口</strong>
                    <code>{proxyParts.port}</code>
                  </span>
                  <span>
                    <strong>用户名</strong>
                    <code>{proxyParts.username}</code>
                  </span>
                  <span>
                    <strong>密码</strong>
                    <code>{proxyParts.password}</code>
                  </span>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void props.copyText(proxyTemplate, "已复制代理格式模板，请按此格式填写。")}
            >
              复制代理格式
            </button>
          </div>
        </div>
      </Panel>
    </>
  );
}

function SettingItem(props: { label: string; value: string }) {
  return (
    <div className="setting">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function CopyGuide(props: { passwordText: string }) {
  return (
    <div className="copy-guide">
      <span>{props.passwordText}</span>
      <ol>
        <li>先复制整行代理字符串。</li>
        <li>如果软件不能整行导入，就看下面拆开的主机、端口、用户名、密码。</li>
        <li>按顺序填写：主机、端口、用户名、密码。</li>
      </ol>
    </div>
  );
}

function parseProxyTemplate(value: string): ProxyParts | null {
  const parts = value.split(":");
  if (parts.length < 4) return null;
  const [host, port, username, ...passwordParts] = parts;
  const password = passwordParts.join(":");
  if (!host || !port || !username || !password) return null;
  return { host, password, port, username };
}

function formatDuration(value: number | null | undefined): string {
  if (!value || value <= 0) return "0";
  if (value % (60 * 60 * 1000) === 0) return `${value / (60 * 60 * 1000)} 小时`;
  if (value % (60 * 1000) === 0) return `${value / (60 * 1000)} 分钟`;
  if (value % 1000 === 0) return `${value / 1000} 秒`;
  return `${value} ms`;
}
