import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await adminFetch(`/admin/orders/${id}/sync-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync payment" },
      { status: 500 }
    );
  }
}
