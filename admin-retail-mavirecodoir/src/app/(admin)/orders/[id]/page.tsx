"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Package, ExternalLink, Mail, CreditCard, Truck, RotateCcw, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success",
  processing: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
  canceled: "bg-destructive/10 text-destructive",
  requires_action: "bg-warning/10 text-warning",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingVeeqo, setSyncingVeeqo] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState(false);
  const [paymentSyncResult, setPaymentSyncResult] = useState<any>(null);

  const fetchOrder = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setOrder(d.order || d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleVeeqoSync = async () => {
    setSyncingVeeqo(true);
    try {
      const res = await fetch(`/api/admin/veeqo/orders/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      await fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync to Veeqo");
    } finally {
      setSyncingVeeqo(false);
    }
  };

  const handlePaymentSync = async () => {
    setSyncingPayment(true);
    setPaymentSyncResult(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/sync-payment`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setPaymentSyncResult(data);
      await fetchOrder();
    } catch (err) {
      setPaymentSyncResult({ error: err instanceof Error ? err.message : "Failed to sync payment" });
    } finally {
      setSyncingPayment(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Loading order...</div>;
  if (error) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Error: {error}</div>;
  if (!order) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Order not found.</div>;

  const status = (order.status || "pending").toLowerCase();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <a href="/orders" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Orders
        </a>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Order #{order.display_id || order.id?.slice(0, 8)}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusStyles[status] || "bg-muted text-muted-foreground"}`}>
              {status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{order.created_at ? formatDate(order.created_at) : "—"}</p>
        </div>
        <a
          href={`https://admin-backend.mavirecodoir.com/app/orders/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Open in Medusa Admin <ExternalLink size={12} />
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Package size={14} className="text-muted-foreground" /> Items ({order.items?.length || 0})
            </h2>
            <div className="divide-y divide-border">
              {(order.items || []).map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.title} className="h-14 w-14 rounded-lg object-cover bg-muted shrink-0" />
                  )}
                  {!item.thumbnail && (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted shrink-0">
                      <Package size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title || item.product_title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku || "—"} · Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm text-foreground font-medium">{formatPrice(item.total ?? ((item.unit_price || 0) * (item.quantity || 0)), order.currency_code)}</p>
                </div>
              ))}
              {(!order.items || order.items.length === 0) && (
                <p className="text-xs text-muted-foreground py-3">No items</p>
              )}
            </div>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Truck size={14} className="text-muted-foreground" /> Fulfillment
            </h2>
            <p className="text-xs text-muted-foreground">
              Status: <span className="text-foreground capitalize">{(order.fulfillment_status || "—").replace("_", " ")}</span>
            </p>
            {order.fulfillments?.length > 0 && (
              <div className="mt-3 space-y-2">
                {(order.fulfillments || []).map((f: any) => {
                  const fData = f.data || {};
                  return (
                    <div key={f.id} className="bg-muted rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{f.id?.slice(0, 8)} — {f.status || "unknown"}</span>
                        {fData.shippo_carrier && (
                          <span className="text-foreground font-medium">{fData.shippo_carrier}</span>
                        )}
                      </div>
                      {fData.shippo_service_level && (
                        <p className="text-muted-foreground mt-1">{fData.shippo_service_level}</p>
                      )}
                      {fData.shippo_tracking_number && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-foreground">Tracking: {fData.shippo_tracking_number}</span>
                          {fData.shippo_tracking_url && (
                            <a
                              href={fData.shippo_tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Track
                            </a>
                          )}
                        </div>
                      )}
                      {fData.shippo_shipment_id && (
                        <a
                          href={`https://app.goshippo.com/shipments/${fData.shippo_shipment_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 mt-2 text-primary hover:underline text-xs"
                        >
                          View in Shippo <ExternalLink size={10} />
                        </a>
                      )}
                      {fData.shippo_label_url && (
                        <a
                          href={fData.shippo_label_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline mt-1 inline-block"
                        >
                          View Label
                        </a>
                      )}
                      {fData.shippo_rate_amount && (
                        <p className="text-muted-foreground mt-1">
                          Cost: {formatPrice(fData.shippo_rate_amount, fData.shippo_rate_currency)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gift and Packaging Options */}
          {(order.metadata?.gift_packaging === "true" || order.metadata?.packaging_type || order.metadata?.gift_message) && (
            <div className="card-bordered p-5">
              <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Package size={14} className="text-muted-foreground" /> Gift & Packaging
              </h2>
              <div className="space-y-2 text-xs">
                {order.metadata?.packaging_type && (
                  <p className="text-muted-foreground">
                    Packaging: <span className="text-foreground capitalize">{order.metadata.packaging_type}</span>
                  </p>
                )}
                {order.metadata?.gift_packaging === "true" && (
                  <p className="text-muted-foreground">
                    Gift Packaging: <span className="text-foreground">Yes</span>
                  </p>
                )}
                {order.metadata?.gift_message && (
                  <div className="text-muted-foreground">
                    Gift Message: <span className="text-foreground block mt-1 p-2 bg-muted rounded">{order.metadata.gift_message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Mail size={14} className="text-muted-foreground" /> Customer
            </h2>
            <p className="text-sm text-foreground">
              {[order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") || order.email || "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{order.email || "—"}</p>
            <a
              href={`/customers/${order.customer_id}`}
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              View profile
            </a>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <CreditCard size={14} className="text-muted-foreground" /> Payment
            </h2>
            <div className="space-y-1.5 text-xs">
              <p className="text-muted-foreground">Status: <span className="text-foreground capitalize">{(order.payment_status || "—").replace("_", " ")}</span></p>
              {order.payments?.map((p: any) => (
                <p key={p.id} className="text-muted-foreground truncate" title={p.id}>
                  {p.provider_id || "—"} · {formatPrice(p.amount, order.currency_code)}
                </p>
              ))}
            </div>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <CreditCard size={14} className="text-muted-foreground" /> Payment Sync
            </h2>
            <div className="space-y-1.5 text-xs">
              <p className="text-muted-foreground">
                Check actual payment status on Stripe and capture if needed
              </p>
              {paymentSyncResult?.results?.map((r: any) => (
                <div key={r.payment_id} className={`p-2 rounded text-xs ${r.status === "synced" ? "bg-success/5 text-success" : r.status === "already_captured" ? "bg-muted text-muted-foreground" : r.status === "error" ? "bg-destructive/5 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  <p>{r.provider} — {r.status.replace(/_/g, " ")}</p>
                  {r.stripe_status && <p className="opacity-70">Stripe: {r.stripe_status}</p>}
                  {r.error && <p className="text-destructive">{r.error}</p>}
                </div>
              ))}
              {paymentSyncResult?.message && (
                <p className="text-muted-foreground">{paymentSyncResult.message}</p>
              )}
              {paymentSyncResult?.error && (
                <p className="text-destructive">{paymentSyncResult.error}</p>
              )}
              <button
                onClick={handlePaymentSync}
                disabled={syncingPayment}
                className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={syncingPayment ? "animate-spin" : ""} />
                {syncingPayment ? "Syncing..." : "Sync Payment"}
              </button>
            </div>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <RefreshCw size={14} className="text-muted-foreground" /> Veeqo Sync
            </h2>
            {order.veeqo_order ? (() => {
              const v = order.veeqo_order;
              const hasError = !!v.last_sync_error;
              const isSynced = !!v.veeqo_order_id && !hasError;
              return (
                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    Status:
                    {isSynced ? (
                      <span className="flex items-center gap-1 text-success"><CheckCircle size={12} /> Synced</span>
                    ) : hasError ? (
                      <span className="flex items-center gap-1 text-destructive"><XCircle size={12} /> Sync Failed</span>
                    ) : (
                      <span className="flex items-center gap-1 text-warning"><Clock size={12} /> Pending</span>
                    )}
                  </p>
                  {v.veeqo_order_id && (
                    <p className="text-muted-foreground">Veeqo Order: <span className="text-foreground font-mono">#{v.veeqo_order_id}</span></p>
                  )}
                  {v.veeqo_status && (
                    <p className="text-muted-foreground">Veeqo Status: <span className="text-foreground capitalize">{(v.veeqo_status || "").replace(/_/g, " ")}</span></p>
                  )}
                  {v.last_synced_at && (
                    <p className="text-muted-foreground">Last synced: <span className="text-foreground">{new Date(v.last_synced_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></p>
                  )}
                  {v.last_sync_attempted_at && !v.last_synced_at && (
                    <p className="text-muted-foreground">Last attempt: <span className="text-foreground">{new Date(v.last_sync_attempted_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></p>
                  )}
                  {hasError && (
                    <div className="text-destructive mt-1 p-2 rounded bg-destructive/5 text-xs space-y-1">
                      <p>Error: {v.last_sync_error}</p>
                      {v.last_sync_error?.includes("veeqo_delivery_method_id") && (
                        <p className="text-warning">Tip: Sync shipping options first in Medusa Admin → Settings → Veeqo, then retry.</p>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleVeeqoSync}
                    disabled={syncingVeeqo}
                    className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={syncingVeeqo ? "animate-spin" : ""} />
                    {syncingVeeqo ? "Syncing..." : "Sync to Veeqo"}
                  </button>
                </div>
              );
            })() : (
              <div className="space-y-1.5 text-xs">
                <p className="text-muted-foreground">Not synced to Veeqo yet</p>
                <button
                  onClick={handleVeeqoSync}
                  disabled={syncingVeeqo}
                  className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className={syncingVeeqo ? "animate-spin" : ""} />
                  {syncingVeeqo ? "Syncing..." : "Sync to Veeqo"}
                </button>
              </div>
            )}
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <RotateCcw size={14} className="text-muted-foreground" /> Returns
            </h2>
            {(order.metadata?.return_requests?.length > 0) ? (
              <div className="space-y-1.5 text-xs">
                {order.metadata.return_requests.map((r: any) => (
                  <p key={r.id} className="text-muted-foreground">
                    {r.id?.slice(0, 8)} — <span className={`capitalize ${r.status === "pending" ? "text-warning" : r.status === "approved" ? "text-success" : "text-destructive"}`}>{r.status}</span>
                    {r.reason && <span className="ml-1">({r.reason})</span>}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No return requests</p>
            )}
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3">Shipping</h2>
            {order.shipping_address && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="text-foreground">{order.shipping_address.first_name} {order.shipping_address.last_name}</p>
                <p>{order.shipping_address.address_1}</p>
                {order.shipping_address.address_2 && <p>{order.shipping_address.address_2}</p>}
                <p>{order.shipping_address.city}, {order.shipping_address.province || ""} {order.shipping_address.postal_code}</p>
                <p>{order.shipping_address.country_code?.toUpperCase()}</p>
                {order.shipping_address.phone && <p>{order.shipping_address.phone}</p>}
              </div>
            )}
            {!order.shipping_address && <p className="text-xs text-muted-foreground">No shipping address</p>}
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3">Summary</h2>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(order.subtotal || 0, order.currency_code)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{formatPrice(order.shipping_total || 0, order.currency_code)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{formatPrice(order.tax_total || 0, order.currency_code)}</span></div>
              <div className="flex justify-between text-foreground font-medium border-t border-border pt-1.5 mt-1.5"><span>Total</span><span>{formatPrice(order.total || 0, order.currency_code)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
