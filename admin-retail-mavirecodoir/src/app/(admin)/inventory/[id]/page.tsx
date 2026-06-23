"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Warehouse, Package, Plus, Minus, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inventoryItem, setInventoryItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/inventory/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setInventoryItem(d.inventory_item || d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdjustment = async () => {
    if (!adjustmentAmount || !adjustmentReason) {
      setError("Please enter adjustment amount and reason");
      return;
    }
    setAdjusting(true);
    try {
      const res = await fetch(`/api/admin/inventory/${id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: adjustmentAmount,
          reason: adjustmentReason,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInventoryItem(data.inventory_item);
      setAdjustmentAmount(0);
      setAdjustmentReason("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Loading inventory...</div>;
  if (error && !inventoryItem) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Error: {error}</div>;
  if (!inventoryItem) return <div className="card-bordered p-12 text-center text-sm text-muted-foreground">Inventory item not found.</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <a href="/inventory" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Inventory
      </a>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Inventory Item</h1>
          <p className="mt-1 text-sm text-muted-foreground">SKU: {inventoryItem.sku || "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/inventory/${id}/locations`)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Warehouse size={14} />
            View Locations
          </button>
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
              <Package size={14} className="text-muted-foreground" /> Item Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">SKU</label>
                <p className="text-sm text-foreground font-mono">{inventoryItem.sku || "—"}</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Title</label>
                <p className="text-sm text-foreground">{inventoryItem.title || inventoryItem.variant?.title || "—"}</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Total Quantity</label>
                <p className="text-2xl font-semibold text-foreground">{inventoryItem.quantity || 0}</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Reserved Quantity</label>
                <p className="text-sm text-foreground">{inventoryItem.reserved_quantity || 0}</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Available Quantity</label>
                <p className="text-sm text-success font-medium">
                  {(inventoryItem.quantity || 0) - (inventoryItem.reserved_quantity || 0)}
                </p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Requires Shipping</label>
                <p className="text-sm text-foreground">{inventoryItem.requires_shipping ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-3">Stock Levels by Location</h2>
            {(inventoryItem.location_levels || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Location</th>
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Stocked</th>
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Reserved</th>
                      <th className="text-left py-2 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inventoryItem.location_levels || []).map((level: any) => (
                      <tr key={level.id} className="border-b border-border last:border-b-0">
                        <td className="py-2 px-2 text-foreground">{level.location?.name || "—"}</td>
                        <td className="py-2 px-2 text-foreground">{level.stocked_quantity || 0}</td>
                        <td className="py-2 px-2 text-muted-foreground">{level.reserved_quantity || 0}</td>
                        <td className="py-2 px-2 text-success font-medium">
                          {(level.stocked_quantity || 0) - (level.reserved_quantity || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No location levels configured</p>
            )}
          </div>

          {(inventoryItem.reservations || []).length > 0 && (
            <div className="card-bordered p-5">
              <h2 className="text-sm font-medium text-foreground mb-3">Active Reservations</h2>
              <div className="space-y-2">
                {(inventoryItem.reservations || []).map((res: any) => (
                  <div key={res.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm text-foreground">Reserved: {res.quantity}</p>
                      <p className="text-xs text-muted-foreground">
                        {res.description || res.line_item_id?.slice(0, 8) || "—"}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      res.location_id ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>
                      {res.location_id ? "Located" : "Unlocated"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <RefreshCw size={14} className="text-muted-foreground" /> Adjust Inventory
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Adjustment Amount</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                  placeholder="Use negative to decrease"
                />
                <p className="text-xs text-muted-foreground mt-1">Positive to add, negative to remove</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Reason</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                >
                  <option value="">Select reason</option>
                  <option value="damaged">Damaged</option>
                  <option value="lost">Lost</option>
                  <option value="restock">Restock</option>
                  <option value="return">Return</option>
                  <option value="correction">Correction</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                onClick={handleAdjustment}
                disabled={adjusting || !adjustmentAmount || !adjustmentReason}
                className="w-full h-9 rounded-lg bg-foreground text-foreground-foreground text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {adjusting ? "Processing..." : "Apply Adjustment"}
              </button>
            </div>
          </div>

          {inventoryItem.variant && (
            <div className="card-bordered p-5">
              <h2 className="text-sm font-medium text-foreground mb-3">Variant Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span className="text-foreground truncate max-w-[150px]">{inventoryItem.variant.product?.title || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variant</span>
                  <span className="text-foreground truncate max-w-[150px]">{inventoryItem.variant.title || "—"}</span>
                </div>
                {inventoryItem.variant.prices?.[0] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="text-foreground">
                      {formatPrice(inventoryItem.variant.prices[0].amount, inventoryItem.variant.prices[0].currency_code)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
