import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await adminFetch(`/admin/inventory-items/${params.id}`) as { inventory_item: any };
    return NextResponse.json({ inventory_item: data.inventory_item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data = await adminFetch(`/admin/inventory-items/${params.id}`, {
      method: "POST",
      body: JSON.stringify(body),
    }) as { inventory_item: any };
    return NextResponse.json({ inventory_item: data.inventory_item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update inventory item" },
      { status: 500 }
    );
  }
}
