import { EmptyState } from "./ui";

export const CHART_COLORS = {
  up: "#4f8cff",
  down: "#2fbf6c",
  primary: "#4f8cff",
  teal: "#38bdf8",
  amber: "#e6a23c",
  free: "#2fbf6c",
  locked: "#4f8cff",
  cooldown: "#e6a23c",
  bad: "#ef4444",
  disabled: "#6b7280"
};

export function Sparkline(props: { values: number[]; color?: string; width?: number; height?: number }) {
  const width = props.width ?? 104;
  const height = props.height ?? 36;
  const color = props.color ?? CHART_COLORS.primary;
  const values = props.values.length ? props.values : [0, 0];
  const realMax = Math.max(...values);
  const flat = realMax <= 0;
  const max = Math.max(1, realMax);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = 3;
  const innerHeight = height - pad * 2;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  function pointY(value: number): number {
    return pad + innerHeight - ((value - min) / range) * innerHeight;
  }

  const line = values.map((value, index) => `${index === 0 ? "M" : "L"} ${(index * stepX).toFixed(1)} ${pointY(value).toFixed(1)}`).join(" ");
  const area = `${line} L ${((values.length - 1) * stepX).toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {flat ? null : <path d={area} fill={color} fillOpacity={0.14} stroke="none" />}
      <path
        d={line}
        fill="none"
        stroke={flat ? "var(--border-strong)" : color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

type LineSeries = {
  label: string;
  color: string;
  values: number[];
};

export function LineChart(props: {
  series: LineSeries[];
  xLabels: string[];
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const width = 640;
  const height = props.height ?? 200;
  const padX = 6;
  const padTop = 10;
  const padBottom = 6;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padTop - padBottom;
  const count = props.xLabels.length;
  const allValues = props.series.flatMap((series) => series.values);
  const max = Math.max(1, ...allValues);
  const formatValue = props.formatValue ?? ((value) => String(value));

  function pointX(index: number): number {
    if (count <= 1) return padX + innerWidth / 2;
    return padX + (innerWidth * index) / (count - 1);
  }

  function pointY(value: number): number {
    return padTop + innerHeight - (innerHeight * value) / max;
  }

  const gridLines = [0, 0.5, 1].map((ratio) => padTop + innerHeight * ratio);
  const ticks = sampleTicks(props.xLabels, 6);

  return (
    <div className="chart">
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ height }} role="img" aria-label="流量趋势">
        {gridLines.map((y, index) => (
          <line key={index} className="chart-grid" x1={padX} y1={y} x2={width - padX} y2={y} />
        ))}
        {props.series.map((series) => {
          const line = series.values
            .map((value, index) => `${index === 0 ? "M" : "L"} ${pointX(index).toFixed(1)} ${pointY(value).toFixed(1)}`)
            .join(" ");
          const baseline = padTop + innerHeight;
          const area = series.values.length
            ? `${line} L ${pointX(series.values.length - 1).toFixed(1)} ${baseline} L ${pointX(0).toFixed(1)} ${baseline} Z`
            : "";
          return (
            <g key={series.label}>
              {area ? <path d={area} fill={series.color} fillOpacity={0.08} stroke="none" /> : null}
              <path
                d={line}
                fill="none"
                stroke={series.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </svg>
      <div className="chart-x">
        {ticks.map((tick) => (
          <span key={`${tick.index}-${tick.label}`}>{tick.label}</span>
        ))}
      </div>
      <div className="chart-legend">
        {props.series.map((series) => {
          const total = series.values.reduce((sum, value) => sum + value, 0);
          return (
            <span key={series.label} className="legend-item">
              <i style={{ background: series.color }} />
              {series.label} {formatValue(total)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

export function Donut(props: {
  segments: DonutSegment[];
  total?: number;
  centerValue?: string;
  centerLabel?: string;
  size?: number;
  formatValue?: (value: number) => string;
}) {
  const size = props.size ?? 140;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentTotal = props.segments.reduce((sum, segment) => sum + segment.value, 0);
  const total = props.total ?? segmentTotal;
  const formatValue = props.formatValue ?? ((value) => String(value));

  let drawn = 0;

  return (
    <div className="donut">
      <div className="donut-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="占比图">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted-soft)" strokeWidth={stroke} />
            {total > 0
              ? props.segments.map((segment) => {
                  const rawLength = (segment.value / total) * circumference;
                  const length = Math.max(0, Math.min(rawLength, circumference - drawn));
                  const node = (
                    <circle
                      key={segment.label}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${length.toFixed(2)} ${(circumference - length).toFixed(2)}`}
                      strokeDashoffset={-drawn}
                    />
                  );
                  drawn += length;
                  return node;
                })
              : null}
          </g>
        </svg>
        {props.centerValue || props.centerLabel ? (
          <div className="donut-center">
            {props.centerValue ? <strong>{props.centerValue}</strong> : null}
            {props.centerLabel ? <span>{props.centerLabel}</span> : null}
          </div>
        ) : null}
      </div>
      <div className="donut-legend">
        {props.segments.map((segment) => (
          <div key={segment.label} className="legend-item">
            <i style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <b>{formatValue(segment.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarList(props: {
  items: { key: string; label: string; value: number }[];
  formatValue?: (value: number) => string;
  color?: string;
  emptyText?: string;
}) {
  const formatValue = props.formatValue ?? ((value) => String(value));
  const color = props.color ?? CHART_COLORS.primary;
  const max = Math.max(1, ...props.items.map((item) => item.value));

  if (props.items.length === 0) {
    return <EmptyState text={props.emptyText ?? "暂无数据"} />;
  }

  return (
    <div className="bar-list">
      {props.items.map((item) => (
        <div key={item.key} className="bar-row">
          <span className="bar-label" title={item.label}>
            {item.label}
          </span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${Math.max(3, (item.value / max) * 100)}%`, background: color }}
            />
          </span>
          <span className="bar-value">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartEmpty(props: { text: string; hint?: string; height?: number }) {
  const width = 640;
  const height = props.height ?? 200;
  const padX = 6;
  const padTop = 10;
  const padBottom = 6;
  const innerHeight = height - padTop - padBottom;
  const gridLines = [0, 0.33, 0.66, 1].map((ratio) => padTop + innerHeight * ratio);

  return (
    <div className="chart-empty">
      <svg
        className="chart-svg chart-empty-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ height }}
        aria-hidden="true"
      >
        {gridLines.map((y, index) => (
          <line key={index} className="chart-grid" x1={padX} y1={y} x2={width - padX} y2={y} />
        ))}
        <line className="chart-empty-base" x1={padX} y1={padTop + innerHeight} x2={width - padX} y2={padTop + innerHeight} />
      </svg>
      <div className="chart-empty-text">
        <strong>{props.text}</strong>
        {props.hint ? <span>{props.hint}</span> : null}
      </div>
    </div>
  );
}

function sampleTicks(labels: string[], maxTicks: number): { index: number; label: string }[] {
  const count = labels.length;
  if (count === 0) return [];
  if (count <= maxTicks) return labels.map((label, index) => ({ index, label }));
  const step = (count - 1) / (maxTicks - 1);
  const ticks: { index: number; label: string }[] = [];
  for (let position = 0; position < maxTicks; position++) {
    const index = Math.round(position * step);
    ticks.push({ index, label: labels[index] });
  }
  return ticks;
}
