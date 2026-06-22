import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";
import { siteConfig } from "@/lib/config";

export async function GET() {
  try {
    const data = await adminFetch("/custom/admin/returns", {
      headers: { "x-admin-secret": siteConfig.adminApiSecret },
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch returns" },
      { status: 500 }
    );
  }
}
