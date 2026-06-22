"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Search, ChevronDown, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/toat";

const priorityStyles: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-warning/10 text-warning",
  medium: "bg-primary/10 text-primary",
  low: "bg-muted text-muted-foreground",
};

const statusStyles: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  in_progress: "bg-warning/10 text-warning",
  closed: "bg-success/10 text-success",
};

const statusIcons: Record<string, any> = {
  open: AlertCircle,
  in_progress: Clock,
  closed: CheckCircle2,
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const toast = useToast();

  const fetchTickets = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter !== "All") params.set("status", statusFilter);
    fetch(`/api/admin/support-tickets?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setTickets(d.tickets || []);
        setCount(d.count ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, [statusFilter]);

  const handleUpdate = async (id: string, updates: Record<string, string>) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/support-tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Ticket Updated", "Support ticket has been updated.");
      fetchTickets();
    } catch (e: any) {
      toast.error("Update Failed", e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const filtered = tickets.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.customer_name?.toLowerCase().includes(q) || t.customer_email?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q);
  });

  const openCount = tickets.filter((t) => t.status !== "closed").length;

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
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Error: {error}</p></div>}
      {loading && !error && <div className="card-bordered p-6 text-center"><p className="text-sm text-muted-foreground">Loading tickets...</p></div>}

      {!loading && !error && (
        <div className="space-y-3">
          {filtered.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status] || AlertCircle;
            return (
              <div key={ticket.id} className="card-bordered p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-muted-foreground">{ticket.id?.slice(0, 8)}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityStyles[ticket.priority] || "bg-muted text-muted-foreground"}`}>
                        {ticket.priority}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[ticket.status] || "bg-muted text-muted-foreground"}`}>
                        <StatusIcon size={10} />
                        {ticket.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ticket.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {ticket.customer_name} &lt;{ticket.customer_email}&gt; · {ticket.created_at ? formatDate(ticket.created_at) : "—"}
                      {ticket.order_id && <span className="ml-2">Order: {ticket.order_id?.slice(0, 8)}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {ticket.assignee && (
                      <span className="text-[10px] text-muted-foreground">{ticket.assignee}</span>
                    )}
                    {ticket.status !== "closed" && (
                      <div className="flex gap-1">
                        <select
                          value=""
                          onChange={(e) => { if (e.target.value) handleUpdate(ticket.id, { status: e.target.value }); }}
                          disabled={actionLoading === ticket.id}
                          className="rounded-lg border border-input bg-background px-2 py-1.5 text-[10px] text-foreground outline-none disabled:opacity-50 cursor-pointer"
                        >
                          <option value="">Status</option>
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed">Closed</option>
                        </select>
                        <select
                          value=""
                          onChange={(e) => { if (e.target.value) handleUpdate(ticket.id, { assignee: e.target.value }); }}
                          disabled={actionLoading === ticket.id}
                          className="rounded-lg border border-input bg-background px-2 py-1.5 text-[10px] text-foreground outline-none disabled:opacity-50 cursor-pointer"
                        >
                          <option value="">Assign</option>
                          <option value="You">You</option>
                          <option value="Thabo M.">Thabo M.</option>
                          <option value="Lindiwe N.">Lindiwe N.</option>
                        </select>
                      </div>
                    )}
                    {ticket.status === "closed" && (
                      <span className="text-[10px] text-success italic">Closed</span>
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
      )}
    </div>
  );
}
