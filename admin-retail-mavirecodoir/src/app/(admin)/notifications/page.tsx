"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle, RefreshCw, Package, RotateCcw, MessageSquare, ShoppingBag, UserPlus } from "lucide-react";

const actionIcons: Record<string, typeof Bell> = {
  order_placed: ShoppingBag,
  return_requested: RotateCcw,
  support_ticket_created: MessageSquare,
  customer_created: UserPlus,
  return_approved: CheckCircle,
  return_rejected: AlertCircle,
  back_in_stock_notified: Bell,
  pre_order_status: Package,
};

const actionColors: Record<string, string> = {
  order_placed: "text-primary",
  return_requested: "text-warning",
  support_ticket_created: "text-info",
  customer_created: "text-success",
  return_approved: "text-success",
  return_rejected: "text-destructive",
  back_in_stock_notified: "text-info",
  pre_order_status: "text-primary",
};

export default function NotificationsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = filter !== "all" ? `?entity_type=${filter}` : "";
    fetch(`/api/admin/audit-log${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setLogs(d.logs || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHrs < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const filters = [
    { value: "all", label: "All" },
    { value: "order", label: "Orders" },
    { value: "return", label: "Returns" },
    { value: "support_ticket", label: "Support" },
    { value: "customer", label: "Customers" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recent activity and events</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card-bordered p-6 text-center">
          <p className="text-sm text-muted-foreground">Could not load notifications: {error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="card-bordered p-8 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="card-bordered p-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const Icon = actionIcons[log.action] || Bell;
            const color = actionColors[log.action] || "text-muted-foreground";
            const details = log.details || {};
            const title = details.title || log.action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

            return (
              <div key={log.id} className="card-bordered p-4 flex items-start gap-3 transition-colors hover:bg-muted/20">
                <div className={`shrink-0 mt-0.5 ${color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  {details.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">{details.message}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    {log.user_role && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {log.user_role.replace("_", " ")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{formatDate(log.created_at)}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{log.entity_type.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
