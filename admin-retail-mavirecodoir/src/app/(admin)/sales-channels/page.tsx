"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Store, Globe, Package } from "lucide-react";

export default function SalesChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch sales channels from Medusa API
    fetch("/api/admin/sales-channels")
      .then((r) => r.json())
      .then((d) => {
        setChannels(d.channels || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Sales Channels</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage multiple sales channels for B2B, B2C, and marketplace sales
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus size={16} />
          Create Channel
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search channels..."
            className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="card-bordered p-8 text-center">
          <p className="text-muted-foreground">Loading sales channels...</p>
        </div>
      ) : channels.length === 0 ? (
        <div className="card-bordered p-8 text-center">
          <Store size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No sales channels yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create sales channels to sell across different platforms and regions
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <div key={channel.id} className="card-bordered p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{channel.name}</h3>
                    <p className="text-sm text-muted-foreground">{channel.type || "Standard"}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${channel.is_disabled ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"}`}>
                  {channel.is_disabled ? "Disabled" : "Active"}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{channel.products_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Orders</span>
                  <span className="font-medium">{channel.orders_count || 0}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
                  Edit
                </button>
                <button className="flex-1 px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
                  View Products
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
