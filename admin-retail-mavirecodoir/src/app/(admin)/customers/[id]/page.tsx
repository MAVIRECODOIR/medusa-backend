"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, ShoppingBag, Calendar, User } from "lucide-react";

const orderStatusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success",
  processing: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
  canceled: "bg-destructive/10 text-destructive",
  requires_action: "bg-warning/10 text-warning",
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/admin/customers/${id}`).then(r => r.json()),
      fetch(`/api/admin/orders?customer_id=${id}&limit=50&fields=id,display_id,email,status,payment_status,total,created_at,currency_code`).then(r => r.json()),
    ])
      .then(([custData, orderData]) => {
        if (custData.error) throw new Error(custData.error);
        if (orderData.error) throw new Error(orderData.error);
        setCustomer(custData.customer || custData);
        setOrders(orderData.orders || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const formatCurrency = (v: number, currency?: string) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "GBP", minimumFractionDigits: 2 }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });

  if (loading) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Loading customer...</div>;
  if (error) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Error: {error}</div>;
  if (!customer) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Customer not found.</div>;

  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="animate-fade-in space-y-6">
      <a href="/customers" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Customers
      </a>

      <div className="card-bordered p-6">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-medium shrink-0">
            {((customer.first_name?.[0] || "") + (customer.last_name?.[0] || "")) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {[customer.first_name, customer.last_name].filter(Boolean).join(" ") || "No name"}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Mail size={12} /> {customer.email || "—"}
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User size={12} /> {customer.has_account ? "Registered" : "Guest"}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> Customer since {customer.created_at ? formatDate(customer.created_at) : "—"}</span>
              <span className="flex items-center gap-1"><ShoppingBag size={12} /> {orders.length} orders</span>
              <span>Total spent: <span className="text-foreground font-medium">{formatCurrency(totalSpent, "GBP")}</span></span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <ShoppingBag size={14} className="text-muted-foreground" /> Order History ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <div className="card-bordered p-8 text-center text-sm text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="card-bordered overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Order</th>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Total</th>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Payment</th>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Date</th>
                    <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-foreground font-medium">#{o.display_id || o.id?.slice(0, 8)}</td>
                      <td className="py-3 px-4 text-foreground">{o.total != null ? formatCurrency(o.total, o.currency_code) : "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${orderStatusStyles[o.status?.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
                          {(o.status || "—").replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{(o.payment_status || "—").replace("_", " ")}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{o.created_at ? formatDate(o.created_at) : "—"}</td>
                      <td className="py-3 px-4 text-right">
                        <a href={`/orders/${o.id}`} className="rounded-lg border border-border px-3 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors inline-block">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
