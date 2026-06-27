import { useMemo, useState } from "react";
import type { AdminReadOnlyPage } from "./ProxyEntryDetail";
import {
  ActionRow,
  CountSummary,
  DataTable,
  EmptyState,
  EmptySummary,
  FilterSummary,
  Metric,
  Panel,
  Status
} from "./shared";

export type RegionInventory = {
  bad: number;
  city: string | null;
  country: string | null;
  free: number;
  key: string;
  label: string;
  locked: number;
  region: string | null;
  total: number;
};

type Props = {
  onOpenAdminReadOnlyPage: (page: AdminReadOnlyPage, options: { country?: string | null; search?: string }) => void;
  regions: RegionInventory[];
};

export function AdminGeo(props: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(props.regions[0]?.key ?? null);
  const [search, setSearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");

  const filteredRegions = useMemo(() => {
    const text = search.trim().toLowerCase();
    return props.regions.filter((region) => {
      const textMatch = !text || region.label.toLowerCase().includes(text) || region.key.toLowerCase().includes(text);
      const inventoryMatch =
        inventoryFilter === "all" ||
        (inventoryFilter === "low" && region.free < 2) ||
        (inventoryFilter === "healthy" && region.free >= 2);
      return textMatch && inventoryMatch;
    });
  }, [inventoryFilter, props.regions, search]);

  const selectedRegion = filteredRegions.find((region) => region.key === selectedKey) ?? filteredRegions[0] ?? null;
  const lowRegions = props.regions.filter((region) => region.free < 2);
  const hasFilters = Boolean(search.trim()) || inventoryFilter !== "all";

  return (
    <>
      <section className="metric-grid compact">
        <Metric label="地区数" value={String(props.regions.length)} />
        <Metric label="低库存" value={String(lowRegions.length)} tone={lowRegions.length > 0 ? "warn" : undefined} />
        <Metric label="可用上游" value={String(props.regions.reduce((total, region) => total + region.free, 0))} />
        <Metric label="已绑定" value={String(props.regions.reduce((total, region) => total + region.locked, 0))} />
        <Metric label="冷却/失败" value={String(props.regions.reduce((total, region) => total + region.bad, 0))} />
      </section>

      <section className="action-strip">
        <div>
          <h2>地区库存工作区</h2>
          <p>先找低库存地区，再查看对应库存构成。检测地区等危险动作先放在详情里禁用。</p>
        </div>
      </section>

      <section className="master-detail">
        <Panel title="地区库存" count={filteredRegions.length}>
          <div className="hint-list">
            <span>搜索可以输入国家、地区、城市或库存键；库存状态可以只看低库存或库存充足的地区。</span>
          </div>

          <div className="table-tools">
            <label>
              搜索
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="国家、地区、城市、库存键" />
            </label>
            <label>
              库存状态
              <select value={inventoryFilter} onChange={(event) => setInventoryFilter(event.target.value)}>
                <option value="all">全部库存</option>
                <option value="low">低库存</option>
                <option value="healthy">库存充足</option>
              </select>
            </label>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setInventoryFilter("all");
                }}
              >
                重置筛选
              </button>
            ) : null}
          </div>

          <FilterSummary
            items={[
              { label: "搜索", value: search.trim() || null, onClear: search.trim() ? () => setSearch("") : null },
              {
                label: "库存状态",
                value: inventoryFilter === "all" ? null : inventoryFilter === "low" ? "低库存" : "库存充足",
                onClear: inventoryFilter === "all" ? null : () => setInventoryFilter("all")
              }
            ]}
          />

          <CountSummary shown={filteredRegions.length} total={props.regions.length} />

          <DataTable minWidth={680} maxHeight={500}>
            <thead>
              <tr>
                <th>地区</th>
                <th>可用</th>
                <th>已绑定</th>
                <th>冷却/失败</th>
                <th>库存状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegions.map((region) => (
                <tr className={selectedRegion?.key === region.key ? "selected-row" : undefined} key={region.key}>
                  <td>
                    <strong>{region.label}</strong>
                  </td>
                  <td>{region.free}</td>
                  <td>{region.locked}</td>
                  <td>{region.bad}</td>
                  <td>
                    <Status status={region.free < 2 ? "low" : "healthy"} />
                  </td>
                  <td>
                    <button type="button" onClick={() => setSelectedKey(region.key)}>
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <EmptySummary shown={filteredRegions.length} total={props.regions.length} emptyText="暂无地区库存。" filteredText="没有符合条件的地区库存" />
        </Panel>

        <RegionDetail onOpenAdminReadOnlyPage={props.onOpenAdminReadOnlyPage} region={selectedRegion} />
      </section>
    </>
  );
}

function RegionDetail(props: {
  onOpenAdminReadOnlyPage: (page: AdminReadOnlyPage, options: { country?: string | null; search?: string }) => void;
  region: RegionInventory | null;
}) {
  if (!props.region) {
    return (
      <Panel title="地区详情">
        <EmptyState text="请选择一个地区。" />
      </Panel>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="section-heading">
        <h2>地区详情</h2>
        <Status status={props.region.free < 2 ? "low" : "healthy"} />
      </div>

      <div className="detail-title">
        <strong>{props.region.label}</strong>
        <span>库存键：{props.region.key}</span>
      </div>

      <div className="detail-grid">
        <DetailRow label="总上游" value={String(props.region.total)} />
        <DetailRow label="可用上游" value={String(props.region.free)} />
        <DetailRow label="已绑定" value={String(props.region.locked)} />
        <DetailRow label="冷却/失败" value={String(props.region.bad)} />
        <DetailRow label="库存状态" value={props.region.free < 2 ? "偏低" : "充足"} />
      </div>

      <div className="deferred-actions">
        <p>查看上游、查看代理、查看日志已经可以安全跳转；检测地区仍然保留禁用。</p>
        <ActionRow>
          <button
            type="button"
            onClick={() => props.onOpenAdminReadOnlyPage("upstreams", { country: props.region?.country ?? null, search: props.region?.label ?? "" })}
          >
            查看上游
          </button>
          <button
            type="button"
            onClick={() => props.onOpenAdminReadOnlyPage("proxies", { country: props.region?.country ?? null, search: props.region?.label ?? "" })}
          >
            查看代理
          </button>
          <button type="button" onClick={() => props.onOpenAdminReadOnlyPage("logs", { search: props.region?.label ?? "" })}>
            查看日志
          </button>
          <button type="button" className="deferred-action-button" disabled title="待安全流程">
            <span>检测地区</span>
            <em>待安全流程</em>
          </button>
        </ActionRow>
      </div>
    </aside>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
