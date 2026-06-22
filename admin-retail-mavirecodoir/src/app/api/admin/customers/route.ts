import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest) {
  try {
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => { params[k] = v; });
    const data = await adminFetch("/admin/customers", { params });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
