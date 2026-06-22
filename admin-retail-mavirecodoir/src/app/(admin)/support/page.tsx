"use client";

import { useState } from "react";
import { MessageSquare, Search, ChevronDown, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

const tickets = [
  { id: "TKT-001", customer: "Sarah Williams", subject: "Order not delivered yet", priority: "High", status: "Open", assignee: "You", date: "2024-12-15", messages: 4 },
  { id: "TKT-002", customer: "David Chen", subject: "Wrong item received", priority: "Urgent", status: "Open", assignee: "Unassigned", date: "2024-12-15", messages: 2 },
  { id: "TKT-003", customer: "Amara Okafor", subject: "Return refund status", priority: "Medium", status: "In Progress", assignee: "Thabo M.", date: "2024-12-14", messages: 6 },
  { id: "TKT-004", customer: "James Mokoena", subject: "Size exchange request", priority: "Low", status: "Closed", assignee: "You", date: "2024-12-13", messages: 3 },
  { id: "TKT-005", customer: "Priya Patel", subject: "Promo code not applied", priority: "Medium", status: "In Progress", assignee: "Lindiwe N.", date: "2024-12-13", messages: 5 },
  { id: "TKT-006", customer: "Michael van der Merwe", subject: "Damaged item on arrival", priority: "Urgent", status: "Open", assignee: "Unassigned", date: "2024-12-12", messages: 1 },
  { id: "TKT-007", customer: "Grace O'Brien", subject: "Shipping address change", priority: "Low", status: "Closed", assignee: "You", date: "2024-12-11", messages: 2 },
  { id: "TKT-008", customer: "Zara Ahmed", subject: "Product availability inquiry", priority: "Medium", status: "Open", assignee: "Unassigned", date: "2024-12-10", messages: 3 },
];

const priorityStyles: Record<string, string> = {
  Urgent: "bg-danger/10 text-danger",
  High: "bg-warning/10 text-warning",
  Medium: "bg-primary/10 text-primary",
  Low: "bg-muted text-muted-foreground",
};

const statusStyles: Record<string, string> = {
  Open: "bg-danger/10 text-danger",
  "In Progress": "bg-warning/10 text-warning",
  Closed: "bg-success/10 text-success",
};

const statusIcons: Record<string, typeof AlertCircle> = {
  Open: AlertCircle,
  "In Progress": Clock,
  Closed: CheckCircle2,
};

export default function SupportPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = tickets.filter((t) => {
    const matchSearch = t.id.toLowerCase().includes(search.toLowerCase()) || t.customer.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = tickets.filter((t) => t.status !== "Closed").length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customer support enquiries and tickets</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <MessageSquare size={14} />
          {openCount} open
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search tickets..."
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
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((ticket) => {
          const StatusIcon = statusIcons[ticket.status] || AlertCircle;
          return (
            <div key={ticket.id} className="card-bordered p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{ticket.id}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityStyles[ticket.priority] || "bg-muted text-muted-foreground"}`}>
                      {ticket.priority}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[ticket.status] || "bg-muted text-muted-foreground"}`}>
                      <StatusIcon size={10} />
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ticket.customer} · {ticket.messages} messages · {ticket.date}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{ticket.assignee}</span>
                  {ticket.status !== "Closed" && (
                    <button className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      Respond
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card-bordered p-12 text-center text-sm text-muted-foreground">No tickets found.</div>
        )}
      </div>
    </div>
  );
}
