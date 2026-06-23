"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Tag, Calendar, Percent } from "lucide-react";
import { getUserRole, hasPermission } from "@/lib/roles";

export default function PromotionsPage() {
  const userRole = getUserRole();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch promotions from Medusa API
    fetch("/api/admin/promotions")
      .then((r) => r.json())
      .then((d) => {
        setPromotions(d.promotions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusStyles: Record<string, string> = {
    active: "bg-success/10 text-success",
    scheduled: "bg-warning/10 text-warning",
    disabled: "bg-muted text-muted-foreground",
    expired: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Promotions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage discounts, campaigns, and promotional offers
          </p>
        </div>
        {hasPermission(userRole, "canCreatePromotions") && (
          <a
            href="/promotions/create"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Create Promotion
          </a>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search promotions..."
            className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="card-bordered p-8 text-center">
          <p className="text-muted-foreground">Loading promotions...</p>
        </div>
      ) : promotions.length === 0 ? (
        <div className="card-bordered p-8 text-center">
          <Tag size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No promotions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create promotions to offer discounts and run marketing campaigns
          </p>
        </div>
      ) : (
        <div className="card-bordered overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Valid Period</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo) => (
                <tr key={promo.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{promo.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Percent size={14} className="text-muted-foreground" />
                      {promo.type || "standard"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{promo.code || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusStyles[promo.status] || statusStyles.disabled}`}>
                      {promo.status || "disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {promo.starts_at ? new Date(promo.starts_at).toLocaleDateString() : "-"}
                      {" → "}
                      {promo.ends_at ? new Date(promo.ends_at).toLocaleDateString() : "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-primary hover:underline text-xs mr-2">Edit</button>
                    <button className="text-primary hover:underline text-xs">Build Campaign</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
