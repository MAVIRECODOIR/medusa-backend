"use client";

import { formatPrice } from "@/lib/utils";

type OrderProps = {
  orders: any[];
};

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success",
  processing: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
  canceled: "bg-destructive/10 text-destructive",
  requires_action: "bg-warning/10 text-warning",
};

export default function RecentOrders({ orders }: OrderProps) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-xs text-muted-foreground">No orders yet</p>
      </div>
    );
  }

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Order</th>
            <th className="text-left py-3 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Customer</th>
            <th className="text-left py-3 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden sm:table-cell">Items</th>
            <th className="text-left py-3 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Total</th>
            <th className="text-left py-3 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Status</th>
            <th className="text-left py-3 px-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hidden md:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order: any) => {
            const status = (order.status || "pending").toLowerCase();
            return (
              <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="py-3 px-2 text-foreground font-medium">
                  #{order.display_id || order.id?.slice(0, 8)}
                </td>
                <td className="py-3 px-2 text-foreground">
                  {order.email || "—"}
                </td>
                <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">
                  {order.items?.length ?? 0}
                </td>
                <td className="py-3 px-2 text-foreground">
                  {order.total != null ? formatPrice(order.total, order.currency_code) : "—"}
                </td>
                <td className="py-3 px-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyles[status] || "bg-muted text-muted-foreground"}`}>
                    {status.replace("_", " ")}
                  </span>
                </td>
                <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                  {order.created_at ? formatDate(order.created_at) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
