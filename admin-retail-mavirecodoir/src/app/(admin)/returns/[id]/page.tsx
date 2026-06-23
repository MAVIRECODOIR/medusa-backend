"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, Package, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/returns/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setReturnOrder(d.return || d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReceive = async () => {
    if (!confirm("Are you sure you want to mark this return as received?")) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/returns/${id}/receive`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReturnOrder(data.return);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this return?")) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/returns/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReturnOrder(data.return);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this return?")) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/returns/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReturnOrder(data.return);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Loading return...</div>;
  if (error) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Error: {error}</div>;
  if (!returnOrder) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Return not found.</div>;

  const status = returnOrder.status || "pending";
  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: "bg-warning/10 text-warning", label: "Pending" },
    requested: { icon: Clock, color: "bg-warning/10 text-warning", label: "Requested" },
    received: { icon: Package, color: "bg-info/10 text-info", label: "Received" },
    approved: { icon: CheckCircle, color: "bg-success/10 text-success", label: "Approved" },
    rejected: { icon: XCircle, color: "bg-destructive/10 text-destructive", label: "Rejected" },
    canceled: { icon: XCircle, color: "bg-muted text-muted-foreground", label: "Canceled" },
  };

  const statusInfo = statusConfig[status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <a href="/returns" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Returns
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>
            <StatusIcon size={12} className="mr-1" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      {error && (
        <div className="card-bordered p-4 bg-destructive/10 border-destructive">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <RotateCcw size={14} className="text-muted-foreground" /> Return Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Return ID</span>
                <span className="text-foreground">{returnOrder.display_id || returnOrder.id?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="text-foreground">{returnOrder.order_id?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{new Date(returnOrder.created_at).toLocaleString()}</span>
              </div>
              {returnOrder.reason && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="text-foreground">{returnOrder.reason}</span>
                </div>
              )}
              {returnOrder.note && (
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground block mb-1">Note</span>
                  <p className="text-foreground">{returnOrder.note}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Package size={14} className="text-muted-foreground" /> Items ({(returnOrder.items || []).length})
            </h2>
            <div className="space-y-3">
              {(returnOrder.items || []).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt="" className="h-12 w-12 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title || item.product_title}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground font-medium">
                      {formatPrice(item.refundable_amount || 0, returnOrder.currency_code || "GBP")}
                    </p>
                    <p className="text-xs text-muted-foreground">Refundable</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {returnOrder.claim_refund_amount !== undefined && (
            <div className="card-bordered p-5">
              <h2 className="text-sm font-medium text-foreground mb-3">Refund Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refund Amount</span>
                  <span className="text-foreground font-medium">
                    {formatPrice(returnOrder.claim_refund_amount, returnOrder.currency_code || "GBP")}
                  </span>
                </div>
                {returnOrder.refund_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refunded Amount</span>
                    <span className="text-success font-medium">
                      {formatPrice(returnOrder.refund_amount, returnOrder.currency_code || "GBP")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3">Actions</h2>
            <div className="space-y-2">
              {status === "pending" || status === "requested" ? (
                <>
                  <button
                    onClick={handleReceive}
                    disabled={processing}
                    className="w-full h-9 rounded-lg bg-foreground text-foreground-foreground text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : "Mark as Received"}
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="w-full h-9 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : "Approve Return"}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processing}
                    className="w-full h-9 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : "Reject Return"}
                  </button>
                </>
              ) : status === "received" ? (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="w-full h-9 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : "Approve & Refund"}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processing}
                    className="w-full h-9 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : "Reject Return"}
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle size={24} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No actions available for this status</p>
                </div>
              )}
            </div>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3">Customer</h2>
            <div className="space-y-2 text-sm">
              <p className="text-foreground">{returnOrder.customer?.email || "—"}</p>
              <p className="text-muted-foreground">
                {[returnOrder.customer?.first_name, returnOrder.customer?.last_name].filter(Boolean).join(" ") || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
