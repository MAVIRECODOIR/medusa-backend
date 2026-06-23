import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => { params[k] = v; });

    const fields = "id,title,thumbnail,variants.title,variants.sku,variants.allow_backorder,variants.inventory_quantity,variants.prices.*";
    const data = await adminFetch<any>("/admin/products", {
      params: { ...params, fields, limit: params.limit || "100" },
    });

    const products = (data.products || []).filter((p: any) =>
      p.variants?.some((v: any) => v.allow_backorder === true)
    );

    return NextResponse.json({ products, count: products.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch pre-order products" },
      { status: 500 }
    );
  }
}
