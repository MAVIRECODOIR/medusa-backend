import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await adminFetch(`/admin/orders/${id}`, {
      params: {
        fields: "*,items.*,items.variant.*,items.variant.product.*,fulfillments.*,payments.*,shipping_address.*,billing_address.*,metadata,veeqo_order.*",
      },
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch order" },
      { status: 500 }
    );
  }
}
