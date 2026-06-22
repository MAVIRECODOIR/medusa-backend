"use client";

import { useState } from "react";
import { Bell, Search, ChevronDown, Package, Users } from "lucide-react";

const requests = [
  { id: "BIS-001", product: "Silk Evening Gown — Burgundy", size: "M", customer: "Lindiwe Nkosi", email: "l.nkosi@email.com", date: "2024-12-15", status: "Notified", requests: 1 },
  { id: "BIS-002", product: "Cashmere Blend Scarf — Ivory", size: "One Size", customer: "Sarah Williams", email: "sarah.w@email.com", date: "2024-12-14", status: "Pending", requests: 3 },
  { id: "BIS-003", product: "Leather Crossbody Bag — Tan", size: "Standard", customer: "Amara Okafor", email: "amara.o@email.com", date: "2024-12-13", status: "Pending", requests: 5 },
  { id: "BIS-004", product: "Wool Tailored Blazer — Navy", size: "L", customer: "Grace O'Brien", email: "grace.ob@email.com", date: "2024-12-12", status: "Notified", requests: 2 },
  { id: "BIS-005", product: "Linen Wide Leg Trousers — Beige", size: "S", customer: "Priya Patel", email: "priya.p@email.com", date: "2024-12-10", status: "Pending", requests: 7 },
  { id: "BIS-006", product: "Handcrafted Bead Necklace", size: "One Size", customer: "Zara Ahmed", email: "z.ahmed@email.com", date: "2024-12-09", status: "Restocked", requests: 4 },
  { id: "BIS-007", product: "Premium Leather Belt — Black", size: "32", customer: "Michael van der Merwe", email: "michael.vdm@email.com", date: "2024-12-08", status: "Pending", requests: 2 },
  { id: "BIS-008", product: "Silk Evening Gown — Burgundy", size: "S", customer: "Thabo Molefe", email: "thabo.m@email.com", date: "2024-12-07", status: "Restocked", requests: 1 },
];

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/10 text-warning",
  Notified: "bg-primary/10 text-primary",
  Restocked: "bg-success/10 text-success",
};

export default function BackInStockPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = requests.filter((r) => {
    const matchSearch = r.product.toLowerCase().includes(search.toLowerCase()) || r.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingTotal = requests.filter((r) => r.status === "Pending").reduce((sum, r) => sum + r.requests, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Back in Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">Product restock notifications and requests</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Users size={14} />
          {pendingTotal} pending requests
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by product or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none h-10 rounded-lg border border-input bg-background pl-3 pr-8 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Notified">Notified</option>
            <option value="Restocked">Restocked</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="card-bordered overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Product</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Size</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">Customer</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Date</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Requests</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Status</th>
                <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Package size={14} />
                      </div>
                      <p className="text-foreground font-medium">{req.product}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">{req.size}</td>
                  <td className="py-3.5 px-4 hidden sm:table-cell">
                    <p className="text-foreground">{req.customer}</p>
                    <p className="text-[10px] text-muted-foreground">{req.email}</p>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">{req.date}</td>
                  <td className="py-3.5 px-4">
                    <span className="text-foreground font-medium">{req.requests}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusStyles[req.status] || "bg-muted text-muted-foreground"}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {req.status === "Pending" ? (
                      <button className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                        Notify All
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
