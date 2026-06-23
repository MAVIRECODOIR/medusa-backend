"use client";

import { useEffect, useState } from "react";
import { Users, Search, Mail, Phone } from "lucide-react";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  vip: "bg-accent text-accent-foreground font-semibold",
  inactive: "bg-muted text-muted-foreground",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
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
      fields: "id,email,first_name,last_name,phone,has_account,orders,metadata,created_at",
    });
    if (search) params.set("q", search);
    fetch(`/api/admin/customers?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setCustomers(d.customers || []);
        setCount(d.count ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0 }).format(v);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  };

  const getInitials = (c: any) => {
    const first = c.first_name || "";
    const last = c.last_name || "";
    return (first[0] || "") + (last[0] || "");
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customer directory and profiles</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Users size={14} />
          {count} customers
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search customers by name, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
        />
      </div>

      {error && (
        <div className="card-bordered p-6 text-center">
          <p className="text-sm text-muted-foreground">Could not load customers: {error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="card-bordered p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading customers...</p>
        </div>
      )}

      {!loading && !error && (
        <div className="card-bordered overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Customer</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Email</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">Orders</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Account</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Since</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {getInitials(c) || "?"}
                        </div>
                        <div>
                          <p className="text-foreground font-medium">
                            {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{c.id?.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-foreground hidden md:table-cell">
                      <p className="flex items-center gap-1.5">
                        <Mail size={10} className="text-muted-foreground" />
                        {c.email || "—"}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-foreground hidden sm:table-cell">
                      {typeof c.orders === 'number' ? c.orders : (c.orders?.length ?? 0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${c.has_account ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {c.has_account ? "Registered" : "Guest"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">
                      {c.created_at ? formatDate(c.created_at) : "—"}
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40">Previous</button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
