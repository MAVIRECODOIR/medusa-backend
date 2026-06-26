"use client";

import { useEffect, useState } from "react";
import { Search, Warehouse, Package, AlertTriangle } from "lucide-react";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch inventory and locations from Medusa API
    Promise.all([
      fetch("/api/admin/inventory").then((r) => r.json()),
      fetch("/api/admin/locations").then((r) => r.json()),
    ])
      .then(([invData, locData]) => {
        setInventory(invData.inventory_items || []);
        setLocations(locData.stock_locations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage stock levels across multiple locations
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card-bordered p-8 text-center">
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="card-bordered p-8 text-center">
          <Warehouse size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No inventory data yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Inventory will appear once products are added
          </p>
        </div>
      ) : (
        <div className="card-bordered overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Available</th>
                <th className="px-4 py-3 font-medium">Reserved</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{item.product_title}</td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{item.sku || "-"}</td>
                  <td className="px-4 py-3 text-sm">{item.location_name || "Default"}</td>
                  <td className="px-4 py-3 text-sm font-medium">{item.available_quantity || 0}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.reserved_quantity || 0}</td>
                  <td className="px-4 py-3 text-sm">
                    {(item.available_quantity || 0) <= 0 ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle size={12} />
                        Out of Stock
                      </span>
                    ) : (item.available_quantity || 0) < 10 ? (
                      <span className="flex items-center gap-1 text-warning">
                        <AlertTriangle size={12} />
                        Low Stock
                      </span>
                    ) : (
                      <span className="text-success">In Stock</span>
                    )}
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
