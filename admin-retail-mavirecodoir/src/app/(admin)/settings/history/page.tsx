"use client";

import { useEffect, useState, useCallback } from "react";
import { History, RefreshCw, Filter } from "lucide-react";

export default function HistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "100" });
    if (roleFilter !== "all") params.set("user_role", roleFilter);
    if (actionFilter !== "all") params.set("action", actionFilter);
    fetch(`/api/admin/audit-log?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setLogs(d.logs || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roleFilter, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const roles = ["all", "retail_staff", "admin", "support_agent"];
  const actions = ["all", "order_placed", "return_approved", "return_rejected", "support_ticket_created", "customer_created", "back_in_stock_notified", "pre_order_status"];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Change History</h1>
          <p className="mt-1 text-sm text-muted-foreground">Audit trail of all changes made by staff members</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="all">All Roles</option>
            {roles.filter((r) => r !== "all").map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
        >
          <option value="all">All Actions</option>
          {actions.filter((a) => a !== "all").map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="card-bordered p-6 text-center">
          <p className="text-sm text-muted-foreground">Could not load history: {error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="card-bordered p-8 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="card-bordered p-12 text-center">
          <History className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No change history recorded yet.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Timestamp</th>
                <th className="text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">User</th>
                <th className="text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Role</th>
                <th className="text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Action</th>
                <th className="text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Entity</th>
                <th className="text-left py-3 px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3 text-xs text-foreground">{formatDate(log.created_at)}</td>
                  <td className="py-3 px-3 text-xs text-foreground">{log.user_id?.slice(0, 12) || "—"}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                      {log.user_role?.replace(/_/g, " ") || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-foreground capitalize">{log.action.replace(/_/g, " ")}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground capitalize">{log.entity_type?.replace(/_/g, " ")}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.details?.message || JSON.stringify(log.details || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
