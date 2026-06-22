import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";
import { siteConfig } from "@/lib/config";

export async function POST(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params;
    const { action } = await req.json();
    const data = await adminFetch(`/custom/admin/returns/${requestId}`, {
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
