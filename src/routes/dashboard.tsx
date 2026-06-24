import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Activity, ArrowDownCircle, ArrowUpCircle, RefreshCw, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MonitorCard, type Monitor } from "@/components/MonitorCard";
import { AddMonitorModal } from "@/components/AddMonitorModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MAX_MONITORS = 10;

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Pulse" }] }),
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "up" | "down";
}) {
  const toneClass =
    tone === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <p className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${toneClass}`}>{value}</p>
    </Card>
  );
}

function DashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      setError(null);
      try {
        const { data } = await api.get<{ success: boolean; data: Monitor[] }>("/monitors");
        setMonitors(Array.isArray(data?.data) ? data.data : []);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          logout();
          navigate({ to: "/login" });
          return;
        }
        setError(err?.response?.data?.message ?? err?.message ?? "Failed to load monitors");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, navigate],
  );

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await api.get(`/monitor/${id}`);
      setMonitors((m) => m.filter((x) => x.monitorId !== id));
      toast.success("Monitor deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete monitor");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const { data } = await api.patch<{ success: boolean; active: boolean }>(`/monitors/${id}/toggle`);
      setMonitors((m) => m.map((x) => (x.monitorId === id ? { ...x, active: data.active } : x)));
      toast.success(data.active ? "Monitor resumed" : "Monitor paused");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update monitor");
    }
  };

  const handleDeleteAll = async () => {
    try {
      await api.get("/deletemonitorall");
      setMonitors([]);
      toast.success("All monitors deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete monitors");
    }
  };

  const upCount = monitors.filter((m) => m.active && m.latestCheck?.isUp === true).length;
  const downCount = monitors.filter((m) => m.active && m.latestCheck?.isUp === false).length;
  const atLimit = monitors.length >= MAX_MONITORS;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {monitors.length} of {MAX_MONITORS} monitors used
            {atLimit && " — limit reached"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => load(true)} disabled={refreshing} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          {monitors.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="h-4 w-4" />
                  Delete all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all monitors?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All monitors will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll}>Delete all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AddMonitorModal onAdded={() => load()} disabled={atLimit} />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total monitors" value={monitors.length} icon={Activity} tone="default" />
        <Stat label="Up" value={upCount} icon={ArrowUpCircle} tone="up" />
        <Stat label="Down" value={downCount} icon={ArrowDownCircle} tone="down" />
      </div>

      <section className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => load()}>
              Try again
            </Button>
          </Card>
        ) : monitors.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No monitors yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first URL to start tracking its uptime and response time.
            </p>
            <div className="mt-2">
              <AddMonitorModal onAdded={() => load()} />
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {monitors.map((m) => (
              <MonitorCard key={m.monitorId} monitor={m} onDelete={handleDelete} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
