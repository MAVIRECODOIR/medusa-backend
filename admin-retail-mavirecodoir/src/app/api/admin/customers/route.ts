import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest) {
  try {
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => { params[k] = v; });
    
    // Ensure we get orders data
    if (!params.fields) {
      params.fields = "id,email,first_name,last_name,phone,has_account,metadata,created_at,orders";
    }
    
    const data = await adminFetch("/admin/customers", { params });
    
    // Add order count to each customer
    const customers = (data.customers || []).map((c: any) => ({
      ...c,
      orders: Array.isArray(c.orders) ? c.orders.length : 0
    }));
    
    return NextResponse.json({ ...data, customers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
