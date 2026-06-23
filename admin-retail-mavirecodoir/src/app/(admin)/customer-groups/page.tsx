"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Users, Layers } from "lucide-react";

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch customer groups from Medusa API
    fetch("/api/admin/customer-groups")
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.groups || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Customer Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Segment customers for targeted marketing and promotions
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus size={16} />
          Create Group
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search groups..."
            className="w-full pl-9 pr-4 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="card-bordered p-8 text-center">
          <p className="text-muted-foreground">Loading customer groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="card-bordered p-8 text-center">
          <Layers size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No customer groups yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create groups to segment customers for targeted marketing
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className="card-bordered p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">{group.customers_count || 0} customers</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {group.description || "No description"}
              </p>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
                  Edit
                </button>
                <button className="flex-1 px-3 py-1.5 text-xs font-medium border border-input rounded-md hover:bg-accent transition-colors">
                  View Customers
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
