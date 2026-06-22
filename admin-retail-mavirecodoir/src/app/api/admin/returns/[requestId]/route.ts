import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";
import { siteConfig } from "@/lib/config";

export async function POST(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params;
    const { action, order_id } = await req.json();

    const searchParams = new URLSearchParams();
    if (order_id) searchParams.set("order_id", order_id);

    const path = `/custom/admin/returns/${requestId}${searchParams.toString() ? "?" + searchParams.toString() : ""}`;

    const data = await adminFetch(path, {
      method: "POST",
      headers: {
        "x-admin-secret": siteConfig.adminApiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to handle return" },
      { status: 500 }
    );
  }
}
