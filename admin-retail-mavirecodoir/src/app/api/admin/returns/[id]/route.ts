import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await adminFetch(`/admin/returns/${params.id}`);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch return" },
      { status: 500 }
    );
  }
}
