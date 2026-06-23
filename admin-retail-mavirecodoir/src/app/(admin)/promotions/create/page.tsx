"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Calendar, Percent, Tag } from "lucide-react";
import { getUserRole, hasPermission } from "@/lib/roles";

export default function CreatePromotionPage() {
  const router = useRouter();
  const userRole = getUserRole();

  // Check permission
  if (!hasPermission(userRole, "canCreatePromotions")) {
    return (
      <div className="card-bordered p-12 text-center">
        <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You don't have permission to create promotions.</p>
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "",
    description: "",
    starts_at: "",
    ends_at: "",
    max_redemptions: "",
    regions: [] as string[],
    products: [] as string[],
    customer_groups: [] as string[],
  });
  const [regions, setRegions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerGroups, setCustomerGroups] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/regions").then(r => r.json()),
      fetch("/api/admin/products?limit=100").then(r => r.json()),
      fetch("/api/admin/customer-groups").then(r => r.json()),
    ]).then(([regionsData, productsData, groupsData]) => {
      setRegions(regionsData.regions || []);
      setProducts(productsData.products || []);
      setCustomerGroups(groupsData.customer_groups || []);
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.value) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
          max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions) : null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push(`/promotions/${data.promotion.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <a href="/promotions" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Promotions
      </a>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create Promotion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a new discount promotion</p>
      </div>

      {error && (
        <div className="card-bordered p-4 bg-destructive/10 border-destructive">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Promotion Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                  placeholder="SUMMER2024"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed">Fixed Amount</option>
                  <option value=" free_shipping">Free Shipping</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
                  {formData.type === "percentage" ? "Discount Percentage *" : "Discount Amount *"}
                </label>
                <div className="relative">
                  {formData.type === "percentage" && (
                    <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  )}
                  <input
                    type="number"
                    required
                    min="0"
                    step={formData.type === "percentage" ? "1" : "0.01"}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className={`w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors ${formData.type === "percentage" ? "pl-9" : ""}`}
                    placeholder={formData.type === "percentage" ? "20" : "10.00"}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-20 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors resize-none"
                  placeholder="Describe this promotion..."
                />
              </div>
            </div>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-muted-foreground" /> Schedule
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Start Date</label>
                <input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">End Date</label>
                <input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="card-bordered p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Conditions</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Max Redemptions</label>
                <input
                  type="number"
                  min="0"
                  value={formData.max_redemptions}
                  onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Applicable Regions</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {regions.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.regions.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, regions: [...formData.regions, r.id] });
                          } else {
                            setFormData({ ...formData, regions: formData.regions.filter(id => id !== r.id) });
                          }
                        }}
                        className="rounded border-input"
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-foreground text-foreground-foreground text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Promotion"}
          </button>
        </div>
      </form>
    </div>
  );
}
