"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter } from "lucide-react";

export default function DraftOrdersPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch draft orders from Medusa API
    fetch("/api/admin/draft-orders")
      .then((r) => r.json())
      .then((d) => {
        setDrafts(d.drafts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Draft Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage draft orders for quotes and manual order entry
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus size={16} />
          Create Draft Order
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search draft orders..."
            className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button className="p-2 border border-input rounded-md hover:bg-accent transition-colors">
          <Filter size={16} />
        </button>
      </div>

      {loading ? (
        <div className="card-bordered p-8 text-center">
          <p className="text-muted-foreground">Loading draft orders...</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="card-bordered p-8 text-center">
          <p className="text-muted-foreground">No draft orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a draft order to generate quotes or take phone orders
          </p>
        </div>
      ) : (
        <div className="card-bordered overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Draft ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => (
                <tr key={draft.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm">{draft.display_id || draft.id}</td>
                  <td className="px-4 py-3 text-sm">{draft.email || "Guest"}</td>
                  <td className="px-4 py-3 text-sm">{draft.total}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                      {draft.status || "open"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(draft.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-primary hover:underline text-xs">View</button>
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
