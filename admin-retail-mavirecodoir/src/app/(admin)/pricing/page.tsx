"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Percent, Layers, DollarSign } from "lucide-react";

export default function PricingPage() {
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch price lists from Medusa API
    fetch("/api/admin/price-lists")
      .then((r) => r.json())
      .then((d) => {
        setPriceLists(d.price_lists || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Pricing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage price lists, tiered pricing, and currency-specific prices
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus size={16} />
          Create Price List
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search price lists..."
            className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="card-bordered p-8 text-center">
          <p className="text-muted-foreground">Loading price lists...</p>
        </div>
      ) : priceLists.length === 0 ? (
        <div className="card-bordered p-8 text-center">
          <Percent size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No price lists yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create price lists for B2B pricing, volume discounts, or currency-specific prices
          </p>
        </div>
      ) : (
        <div className="card-bordered overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Customer Groups</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {priceLists.map((list) => (
                <tr key={list.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{list.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-muted-foreground" />
                      {list.type || "sale"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{list.currency_code || "GBP"}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Layers size={12} className="text-muted-foreground" />
                      {list.customer_groups_count || 0} groups
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${list.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {list.status || "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-primary hover:underline text-xs mr-2">Edit</button>
                    <button className="text-primary hover:underline text-xs">View Prices</button>
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
