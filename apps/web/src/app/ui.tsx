import { useEffect, useMemo, useState, type ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export type Paged<T> = {
  pageItems: T[];
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export function usePaged<T>(items: T[], initialPageSize = 10): Paged<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    pageItems,
    page: safePage,
    totalPages,
    pageSize,
    total,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    }
  };
}

export function TablePager(props: { paged: Paged<unknown>; unit?: string }) {
  const { paged } = props;
  const unit = props.unit ?? "条";
  if (paged.total === 0) return null;

  const start = (paged.page - 1) * paged.pageSize + 1;
  const end = Math.min(paged.total, paged.page * paged.pageSize);

  return (
    <div className="table-pager">
      <div className="table-pager-left">
        <span className="table-pager-count">
          共 {paged.total} {unit} · 第 {start}–{end}
        </span>
        <label className="table-pager-size">
          每页
          <select value={paged.pageSize} onChange={(event) => paged.setPageSize(Number(event.target.value))}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          行
        </label>
      </div>
      <div className="table-pager-nav">
        <Button size="sm" disabled={paged.page <= 1} onClick={() => paged.setPage(paged.page - 1)}>
          上一页
        </Button>
        <span className="table-pager-page">
          第 {paged.page} / {paged.totalPages} 页
        </span>
        <Button size="sm" disabled={paged.page >= paged.totalPages} onClick={() => paged.setPage(paged.page + 1)}>
          下一页
        </Button>
      </div>
    </div>
  );
}

type ButtonVariant = "primary" | "default" | "ghost" | "danger";

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}) {
  const variant = props.variant ?? "default";
  const size = props.size ?? "md";
  return (
    <button
      type={props.type ?? "button"}
      className={cx("btn", `btn-${variant}`, size === "sm" && "btn-sm")}
      onClick={props.onClick}
      disabled={props.disabled || props.loading}
      title={props.title}
    >
      {props.loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      <span>{props.children}</span>
    </button>
  );
}

export function Card(props: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="card">
      {props.title || props.actions ? (
        <header className="card-head">
          <div className="card-head-text">
            {props.title ? <h2>{props.title}</h2> : null}
            {props.subtitle ? <p className="card-subtitle">{props.subtitle}</p> : null}
          </div>
          {props.actions ? <div className="card-actions">{props.actions}</div> : null}
        </header>
      ) : null}
      <div className={cx("card-body", props.bodyClassName)}>{props.children}</div>
    </section>
  );
}

export function StatTile(props: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  icon?: ReactNode;
  accent?: "blue" | "green" | "indigo" | "amber" | "teal" | "slate";
}) {
  return (
    <div className={cx("stat-tile", props.tone && props.tone !== "default" && `tone-${props.tone}`)}>
      {props.icon ? <span className={cx("stat-icon", props.accent && `accent-${props.accent}`)}>{props.icon}</span> : null}
      <div className="stat-main">
        <span className="stat-label">{props.label}</span>
        <strong className="stat-value">{props.value}</strong>
        {props.hint ? <span className="stat-hint">{props.hint}</span> : null}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "good",
  free: "good",
  success: "good",
  healthy: "good",
  locked: "info",
  cooldown: "warn",
  low: "warn",
  disabled: "muted",
  dead: "bad",
  bad: "bad",
  failed: "bad"
};

export function StatusBadge(props: { status: string; label: string }) {
  const tone = STATUS_TONE[props.status] ?? "muted";
  return <span className={cx("badge", `badge-${tone}`)}>{props.label}</span>;
}

export function DataTable(props: { minWidth?: number; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table style={props.minWidth ? { minWidth: props.minWidth } : undefined}>{props.children}</table>
    </div>
  );
}

export function EmptyState(props: { text: string; hint?: string }) {
  return (
    <div className="empty-state">
      <p>{props.text}</p>
      {props.hint ? <span>{props.hint}</span> : null}
    </div>
  );
}

export function Loading(props: { text?: string }) {
  return (
    <div className="loading-state">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{props.text ?? "读取中…"}</span>
    </div>
  );
}

export function MessageBar(props: { tone: "error" | "success"; text: string; onDismiss?: () => void }) {
  return (
    <div className={cx("message-bar", `message-${props.tone}`)} role="status" aria-live="polite">
      <span>{props.text}</span>
      {props.onDismiss ? (
        <button type="button" className="message-close" aria-label="关闭提示" onClick={props.onDismiss}>
          ×
        </button>
      ) : null}
    </div>
  );
}

export function Field(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      {props.children}
      {props.hint ? <span className="field-hint">{props.hint}</span> : null}
    </label>
  );
}

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        style={props.width ? { maxWidth: props.width } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{props.title}</h2>
          <button type="button" className="icon-button" aria-label="关闭" onClick={props.onClose}>
            ×
          </button>
        </header>
        <div className="modal-body">{props.children}</div>
        {props.footer ? <footer className="modal-foot">{props.footer}</footer> : null}
      </section>
    </div>
  );
}

function fallbackCopyText(value: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyTextToClipboard(value: string): Promise<boolean> {
  if (!value) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return fallbackCopyText(value);
    }
  }

  return fallbackCopyText(value);
}

export function CopyButton(props: { value: string; label?: string; size?: "md" | "sm" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyTextToClipboard(props.value);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      setCopied(false);
    }
  }

  return (
    <Button variant={copied ? "primary" : "default"} size={props.size ?? "sm"} onClick={copy}>
      {copied ? "已复制" : props.label ?? "复制"}
    </Button>
  );
}
