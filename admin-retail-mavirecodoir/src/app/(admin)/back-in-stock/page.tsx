"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Package } from "lucide-react";
import { useToast } from "@/components/ui/toat";

const statusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  notified: "bg-primary/10 text-primary",
  restocked: "bg-success/10 text-success",
};

export default function BackInStockPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const toast = useToast();

  const fetchRegistrations = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("email", search);
    fetch(`/api/admin/stock-interest?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRegistrations(d.registrations || []);
        setCount(d.count ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRegistrations(); }, []);

  useEffect(() => { fetchRegistrations(); }, [search]);

  const handleNotify = async (productId: string) => {
    setActionLoading(productId);
    try {
      const res = await fetch("/api/admin/stock-interest/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Notifications Sent", `${data.notified || 0} customers notified.`);
      fetchRegistrations();
    } catch (e: any) {
      toast.error("Notify Failed", e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });

  const pendingTotal = registrations.filter((r) => !r.notified_at).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Back in Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">Product restock notifications and requests</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Bell size={14} />
          {pendingTotal} pending
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
        />
      </div>

      {error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Could not load: {error}</p></div>}
      {loading && !error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Loading...</p></div>}

      {!loading && !error && (
        <div className="card-bordered overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">Product ID</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Date</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r: any) => {
                  const status = r.notified_at ? "notified" : "pending";
                  return (
                    <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="text-foreground text-sm">{r.email}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{r.id?.slice(0, 8)}</p>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs font-mono hidden sm:table-cell">{r.product_id?.slice(0, 12)}...</td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell text-xs">{r.created_at ? formatDate(r.created_at) : "—"}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusStyles[status] || "bg-muted text-muted-foreground"}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {status === "pending" ? (
                          <button
                            onClick={() => handleNotify(r.product_id)}
                            disabled={actionLoading === r.product_id}
                            className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            Notify
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            {r.notified_at ? formatDate(r.notified_at) : "Completed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No registrations found.</td>
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
