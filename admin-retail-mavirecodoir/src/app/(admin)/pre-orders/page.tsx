"use client";

import { useState } from "react";
import { Package, Search, ChevronDown, Clock, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";

const preorders = [
  { id: "PRE-001", product: "Limited Edition Silk Gown — Rose Gold", variant: "M", customer: "Amara Okafor", email: "amara.o@email.com", qty: 1, deposit: 850.00, total: 4250.00, status: "Deposit Paid", eta: "2025-01-15", date: "2024-12-01" },
  { id: "PRE-002", product: "Handcrafted Leather Satchel — Cognac", variant: "Standard", customer: "Sarah Williams", email: "sarah.w@email.com", qty: 1, deposit: 500.00, total: 2500.00, status: "Awaiting Deposit", eta: "2025-01-20", date: "2024-12-03" },
  { id: "PRE-003", product: "Cashmere Overcoat — Camel", variant: "L", customer: "Michael van der Merwe", email: "michael.vdm@email.com", qty: 2, deposit: 1200.00, total: 6000.00, status: "Processing", eta: "2025-01-10", date: "2024-11-28" },
  { id: "PRE-004", product: "Artisan Ceramic Vase — Limited Run", variant: "Tall", customer: "Priya Patel", email: "priya.p@email.com", qty: 1, deposit: 340.00, total: 1700.00, status: "Fulfilled", eta: "2024-12-20", date: "2024-11-15" },
  { id: "PRE-005", product: "Merino Wool Throw — Charcoal", variant: "King", customer: "Grace O'Brien", email: "grace.ob@email.com", qty: 3, deposit: 0, total: 2400.00, status: "Awaiting Deposit", eta: "2025-01-25", date: "2024-12-05" },
  { id: "PRE-006", product: "Limited Edition Silk Gown — Rose Gold", variant: "S", customer: "Lindiwe Nkosi", email: "l.nkosi@email.com", qty: 1, deposit: 850.00, total: 4250.00, status: "Deposit Paid", eta: "2025-01-15", date: "2024-12-02" },
  { id: "PRE-007", product: "Handcrafted Leather Satchel — Cognac", variant: "Standard", customer: "Thabo Molefe", email: "thabo.m@email.com", qty: 1, deposit: 500.00, total: 2500.00, status: "Deposit Paid", eta: "2025-01-20", date: "2024-12-04" },
  { id: "PRE-008", product: "Cashmere Overcoat — Camel", variant: "XL", customer: "David Chen", email: "d.chen@email.com", qty: 1, deposit: 600.00, total: 3000.00, status: "Processing", eta: "2025-01-10", date: "2024-11-30" },
];

const statusStyles: Record<string, string> = {
  "Awaiting Deposit": "bg-muted text-muted-foreground",
  "Deposit Paid": "bg-primary/10 text-primary",
  Processing: "bg-warning/10 text-warning",
  Fulfilled: "bg-success/10 text-success",
};

const statusIcons: Record<string, typeof DollarSign> = {
  "Awaiting Deposit": DollarSign,
  "Deposit Paid": Clock,
  Processing: AlertTriangle,
  Fulfilled: CheckCircle,
};

export default function PreOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = preorders.filter((p) => {
    const matchSearch = p.id.toLowerCase().includes(search.toLowerCase()) || p.product.toLowerCase().includes(search.toLowerCase()) || p.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0 }).format(v);

  const activePreorders = preorders.filter((p) => p.status !== "Fulfilled").length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Pre-orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage pre-order requests and fulfillment</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Package size={14} />
          {activePreorders} active
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search pre-orders..."
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
            <option value="Awaiting Deposit">Awaiting Deposit</option>
            <option value="Deposit Paid">Deposit Paid</option>
            <option value="Processing">Processing</option>
            <option value="Fulfilled">Fulfilled</option>
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
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Customer</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">Deposit</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Total</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Status</th>
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">ETA</th>
                <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pre) => {
                const StatusIcon = statusIcons[pre.status] || Package;
                return (
                  <tr key={pre.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                          <Package size={14} />
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{pre.product}</p>
                          <p className="text-[10px] text-muted-foreground">{pre.variant} · Qty: {pre.qty}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-foreground">{pre.customer}</p>
                      <p className="text-[10px] text-muted-foreground">{pre.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-foreground hidden sm:table-cell">{pre.deposit === 0 ? <span className="text-muted-foreground">—</span> : formatCurrency(pre.deposit)}</td>
                    <td className="py-3.5 px-4 text-foreground font-medium hidden md:table-cell">{formatCurrency(pre.total)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusStyles[pre.status] || "bg-muted text-muted-foreground"}`}>
                        <StatusIcon size={10} />
                        {pre.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">{pre.eta}</td>
                    <td className="py-3.5 px-4 text-right">
                      {pre.status !== "Fulfilled" ? (
                        <button className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          Update
                        </button>
                      ) : (
                        <span className="text-[10px] text-success italic">Delivered</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No pre-orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
