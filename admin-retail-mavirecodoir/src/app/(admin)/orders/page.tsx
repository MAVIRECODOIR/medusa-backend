"use client";

import { useEffect, useState } from "react";
import { Search, Package } from "lucide-react";

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success",
  processing: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
  canceled: "bg-destructive/10 text-destructive",
  requires_action: "bg-warning/10 text-warning",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(page * limit),
      fields: "id,display_id,email,items,status,payment_status,fulfillment_status,total,currency_code,created_at",
    });
    if (search) params.set("q", search);
    fetch(`/api/admin/orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setOrders(d.orders || []);
        setCount(d.count ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  const formatCurrency = (v: number, currency?: string) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
      minimumFractionDigits: 0,
    }).format(v / 100);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage customer orders</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Package size={14} />
          {count} orders
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search orders by ID or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
        />
      </div>

      {error && (
        <div className="card-bordered p-6 text-center">
          <p className="text-sm text-muted-foreground">Could not load orders: {error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="card-bordered p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      )}

      {!loading && !error && (
        <div className="card-bordered overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Order</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Customer</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">Items</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Total</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Payment</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden lg:table-cell">Date</th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const status = (order.status || "pending").toLowerCase();
                  return (
                    <tr key={order.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 text-foreground font-medium">
                        #{order.display_id || order.id?.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 text-foreground hidden md:table-cell">
                        {order.email || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden sm:table-cell">
                        {order.items?.length ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-medium">
                        {order.total != null ? formatCurrency(order.total, order.currency_code) : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusStyles[status] || "bg-muted text-muted-foreground"}`}>
                          {status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell capitalize">
                        {(order.payment_status || "—").replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden lg:table-cell">
                        {order.created_at ? formatDate(order.created_at) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <a
                          href={`/orders/${order.id}`}
                          className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors inline-block"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
