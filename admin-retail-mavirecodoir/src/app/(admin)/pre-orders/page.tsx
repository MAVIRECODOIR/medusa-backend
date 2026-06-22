"use client";

import { useEffect, useState } from "react";
import { Package, Search, ChevronDown, Clock, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";

const statusStyles: Record<string, string> = {
  awaiting_deposit: "bg-muted text-muted-foreground",
  deposit_paid: "bg-primary/10 text-primary",
  processing: "bg-warning/10 text-warning",
  fulfilled: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusIcons: Record<string, any> = {
  awaiting_deposit: DollarSign,
  deposit_paid: Clock,
  processing: AlertTriangle,
  fulfilled: CheckCircle,
};

export default function PreOrdersPage() {
  const [preOrders, setPreOrders] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPreOrders = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter !== "All") params.set("status", statusFilter);
    fetch(`/api/admin/pre-orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPreOrders(d.pre_orders || []);
        setCount(d.count ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPreOrders(); }, [statusFilter]);

  const handleStatusUpdate = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/pre-orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchPreOrders();
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (v: number, currency?: string) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: currency || "ZAR", minimumFractionDigits: 0 }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });

  const filtered = preOrders.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.email?.toLowerCase().includes(q) || p.product_title?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q);
  });

  const activeCount = preOrders.filter((p) => p.status !== "fulfilled" && p.status !== "cancelled").length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Pre-orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage pre-order requests and fulfillment</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Package size={14} />
          {activeCount} active
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search pre-orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none h-10 rounded-lg border border-input bg-background pl-3 pr-8 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="awaiting_deposit">Awaiting Deposit</option>
            <option value="deposit_paid">Deposit Paid</option>
            <option value="processing">Processing</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Error: {error}</p></div>}
      {loading && !error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Loading pre-orders...</p></div>}

      {!loading && !error && (
        <div className="card-bordered overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Product</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Customer</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">Deposit</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Total</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">ETA</th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pre) => {
                  const StatusIcon = statusIcons[pre.status] || Package;
                  const status = pre.status || "awaiting_deposit";
                  return (
                    <tr key={pre.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
                            <Package size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground font-medium truncate">{pre.product_title || pre.product_id?.slice(0, 12)}</p>
                            <p className="text-[10px] text-muted-foreground">{pre.variant_title || ""} · Qty: {pre.quantity}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-foreground text-sm truncate max-w-[180px]">{pre.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-foreground hidden sm:table-cell">
                        {pre.deposit ? formatCurrency(pre.deposit, pre.currency_code) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-medium hidden md:table-cell">
                        {pre.total ? formatCurrency(pre.total, pre.currency_code) : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusStyles[status] || "bg-muted text-muted-foreground"}`}>
                          <StatusIcon size={10} />
                          {status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell text-xs">
                        {pre.eta ? formatDate(pre.eta) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {status !== "fulfilled" && status !== "cancelled" ? (
                          <div className="flex gap-1 justify-end">
                            <select
                              value=""
                              onChange={(e) => { if (e.target.value) handleStatusUpdate(pre.id, e.target.value); }}
                              disabled={actionLoading === pre.id}
                              className="rounded-lg border border-input bg-background px-2 py-1.5 text-[10px] text-foreground outline-none disabled:opacity-50 cursor-pointer"
                            >
                              <option value="">Update</option>
                              <option value="awaiting_deposit">Awaiting Deposit</option>
                              <option value="deposit_paid">Deposit Paid</option>
                              <option value="processing">Processing</option>
                              <option value="fulfilled">Fulfilled</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                          </div>
                        ) : (
                          <span className={`text-[10px] italic ${status === "fulfilled" ? "text-success" : "text-destructive"}`}>
                            {status === "fulfilled" ? "Delivered" : "Cancelled"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No pre-orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
