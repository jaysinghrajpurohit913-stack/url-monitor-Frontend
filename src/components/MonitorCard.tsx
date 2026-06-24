import { useState } from "react";
import { Trash2, ExternalLink, Pause, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface LatestCheck {
  isUp: boolean;
  status: number | null;
  responseTime: number | null;
  checkedAt: string;
}

export interface Monitor {
  monitorId: string;
  url: string;
  active: boolean;
  latestCheck: LatestCheck | null;
}

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export function MonitorCard({
  monitor,
  onDelete,
  onToggle,
}: {
  monitor: Monitor;
  onDelete: (id: string) => Promise<void> | void;
  onToggle: (id: string) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<"delete" | "toggle" | null>(null);
  const check = monitor.latestCheck;
  const isUp = check?.isUp === true;
  const isDown = check && check.isUp === false;
  const statusLabel = !monitor.active
    ? "PAUSED"
    : !check
      ? "PENDING"
      : isUp
        ? "UP"
        : "DOWN";

  const handle = async (kind: "delete" | "toggle") => {
    setBusy(kind);
    try {
      if (kind === "delete") await onDelete(monitor.monitorId);
      else await onToggle(monitor.monitorId);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="group flex flex-col gap-4 p-5 transition-all hover:border-foreground/20 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">URL</p>
          <a
            href={monitor.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-1.5 truncate text-sm font-medium text-foreground hover:underline"
          >
            <span className="truncate">{monitor.url}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
          </a>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            !monitor.active
              ? "bg-muted text-muted-foreground"
              : isUp
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : isDown
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              !monitor.active
                ? "bg-muted-foreground"
                : isUp
                  ? "bg-emerald-500 animate-pulse"
                  : isDown
                    ? "bg-red-500"
                    : "bg-muted-foreground"
            }`}
          />
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
          <p className="mt-1 text-sm font-medium tabular-nums">{check?.status ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Response</p>
          <p className="mt-1 text-sm font-medium tabular-nums">
            {check?.responseTime != null ? `${check.responseTime} ms` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Checked</p>
          <p className="mt-1 text-sm font-medium">{timeAgo(check?.checkedAt)}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handle("toggle")}
          disabled={busy !== null}
        >
          {busy === "toggle" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : monitor.active ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {monitor.active ? "Pause" : "Resume"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => handle("delete")}
          disabled={busy !== null}
        >
          {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete
        </Button>
      </div>
    </Card>
  );
}
