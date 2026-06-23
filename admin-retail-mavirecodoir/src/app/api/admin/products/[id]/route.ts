import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await adminFetch(`/admin/products/${id}`, {
      params: {
        fields: "*,variants.*,variants.prices.*,variants.options.*,images.*,tags.*,collection.*,categories.*",
      },
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch product" },
      { status: 500 }
    );
  }
}
