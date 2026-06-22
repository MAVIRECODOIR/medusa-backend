import { NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET() {
  try {
    const [ordersData, customersData, returnsData] = await Promise.all([
      adminFetch<{ orders: any[]; count: number }>("/admin/orders", {
        params: { limit: "5", fields: "id,display_id,email,status,payment_status,fulfillment_status,total,created_at,currency_code,items" },
      }),
      adminFetch<{ customers: any[]; count: number }>("/admin/customers", {
        params: { limit: "1", fields: "id" },
      }),
      adminFetch<{ orders: any[] }>("/custom/admin/returns", {
        headers: { "x-admin-secret": process.env.ADMIN_API_SECRET || "" } as any,
      }).catch(() => ({ orders: [] })),
    ]);

    const orders = ordersData.orders || [];
    const totalOrders = ordersData.count ?? 0;
    const totalCustomers = customersData.count ?? 0;
    const pendingReturns = (returnsData as any)?.returns?.filter((r: any) =>
      r.requests?.some((req: any) => req.status === "pending")
    ).length ?? 0;

    const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

    const year = new Date().getFullYear();
    const monthlyRevenue = MONTHS.map((name, i) => {
      const monthOrders = orders.filter((o: any) => {
        const d = new Date(o.created_at);
        return d.getFullYear() === year && d.getMonth() === i;
      });
      return {
        name,
        revenue: monthOrders.reduce((s: number, o: any) => s + (o.total ?? 0), 0),
        orders: monthOrders.length,
      };
    });

    // Also fetch all orders for full-year chart when we have more data
    if (orders.length < 12) {
      const allOrders = await adminFetch<{ orders: any[]; count: number }>("/admin/orders", {
        params: { limit: "500", fields: "id,total,created_at", offset: "0" },
      }).catch(() => null);

      if (allOrders?.orders) {
        for (const o of allOrders.orders) {
          const d = new Date(o.created_at);
          if (d.getFullYear() === year) {
            const idx = d.getMonth();
            monthlyRevenue[idx].revenue += o.total ?? 0;
            monthlyRevenue[idx].orders += 1;
          }
        }
        // Recalculate total revenue from all orders
        const totalRevenue = allOrders.orders.reduce((s, o) => s + (o.total ?? 0), 0);
        return NextResponse.json({
          totalOrders: allOrders.count ?? totalOrders,
          totalCustomers,
          pendingReturns,
          revenue: totalRevenue,
          recentOrders: orders,
          monthlyRevenue,
        });
      }
    }

    return NextResponse.json({
      totalOrders,
      totalCustomers,
      pendingReturns,
      revenue,
      recentOrders: orders,
      monthlyRevenue,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
