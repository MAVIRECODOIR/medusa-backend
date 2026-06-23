import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await adminFetch(`/admin/inventory-items/${id}`) as { inventory_item: any };
    return NextResponse.json({ inventory_item: data.inventory_item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await adminFetch(`/admin/inventory-items/${id}`, {
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
