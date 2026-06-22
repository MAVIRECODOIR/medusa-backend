import { NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET() {
  try {
    const [ordersData, customersData] = await Promise.all([
      adminFetch<{ orders: any[]; count: number }>("/admin/orders", {
        params: { limit: "5", fields: "id,display_id,email,status,payment_status,fulfillment_status,total,created_at,currency_code" },
      }),
      adminFetch<{ customers: any[]; count: number }>("/admin/customers", {
        params: { limit: "1", fields: "id" },
      }),
    ]);

    const orders = ordersData.orders || [];
    const totalOrders = ordersData.count ?? 0;
    const totalCustomers = customersData.count ?? 0;

    const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

    return NextResponse.json({
      totalOrders,
      totalCustomers,
      revenue,
      recentOrders: orders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
