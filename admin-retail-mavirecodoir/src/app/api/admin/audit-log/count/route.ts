import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const params: Record<string, string> = {};
    if (since) params.since = since;
    const data = await adminFetch("/admin/audit-log/count", { params });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
