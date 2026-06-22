"use client";

import { useEffect, useState, useCallback } from "react";
import { RotateCcw, ExternalLink, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/toat";

export default function ReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const toast = useToast();

  const fetchReturns = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/returns")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setReturns(d.returns || d.orders || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const handleAction = async (requestId: string, orderId: string, action: "approved" | "rejected") => {
    setActionLoading(requestId);
    try {
      const params = new URLSearchParams({ order_id: orderId });
      const res = await fetch(`/api/admin/returns/${requestId}?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(
        `Return ${action === "approved" ? "Approved" : "Rejected"}`,
        `Return request has been ${action === "approved" ? "approved" : "rejected"} successfully.`
      );
      fetchReturns();
    } catch (e: any) {
      toast.error("Action Failed", e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Returns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review and manage return requests</p>
        </div>
      </div>

      {error && (
        <div className="card-bordered p-6 text-center">
          <p className="text-sm text-muted-foreground">Could not load returns: {error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="card-bordered p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading returns...</p>
        </div>
      )}

      {!loading && !error && returns.length === 0 && (
        <div className="card-bordered p-12 text-center">
          <RotateCcw className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No pending return requests.</p>
        </div>
      )}

      {!loading && !error && returns.map((order: any) => {
        const requests = order.requests || order.metadata?.return_requests || [];
        return requests.map((req: any) => (
          <div key={req.id} className="card-bordered p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Return #{req.id?.slice(0, 8)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Order #{order.display_id || order.id?.slice(0, 8)} — {formatDate(req.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${
                  req.status === "pending" ? "bg-warning/10 text-warning" :
                  req.status === "approved" ? "bg-success/10 text-success" :
                  "bg-destructive/10 text-destructive"
                }`}>
                  {req.status}
                </span>
                <a
                  href={`https://admin-backend.mavirecodoir.com/app/orders/${order.order_id || order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Medusa Admin <ExternalLink size={10} />
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Reason</p>
                <p className="text-sm text-foreground">{req.reason || "Not specified"}</p>
              </div>
              {req.note && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Customer Note</p>
                  <p className="text-sm text-foreground">{req.note}</p>
                </div>
              )}
            </div>

            {order.items?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Order Items</p>
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item: any) => (
                    <span key={item.id} className="text-xs bg-muted rounded-md px-2 py-1 text-foreground">
                      {item.title || item.product_title || "Item"} x{item.quantity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground">
              Submitted {formatDate(req.created_at)}
            </div>

            {req.status === "pending" && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => handleAction(req.id, order.order_id || order.id, "approved")}
                  disabled={actionLoading === req.id}
                  className="flex items-center gap-1.5 rounded-lg bg-success text-white px-4 py-2 text-xs font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                >
                  <Check size={12} /> Approve
                </button>
                <button
                  onClick={() => handleAction(req.id, order.order_id || order.id, "rejected")}
                  disabled={actionLoading === req.id}
                  className="flex items-center gap-1.5 rounded-lg bg-destructive text-white px-4 py-2 text-xs font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  <X size={12} /> Reject
                </button>
              </div>
            )}
          </div>
        ));
      })}
    </div>
  );
}
