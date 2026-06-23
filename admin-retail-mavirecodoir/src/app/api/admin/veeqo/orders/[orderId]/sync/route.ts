import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const data = await adminFetch(`/admin/veeqo/orders/${orderId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync order to Veeqo" },
      { status: 500 }
    );
  }
}
