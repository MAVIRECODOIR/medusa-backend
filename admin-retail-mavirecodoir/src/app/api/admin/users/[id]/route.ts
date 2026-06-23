import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await adminFetch(`/admin/users/${params.id}`);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data = await adminFetch(`/admin/users/${params.id}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await adminFetch(`/admin/users/${params.id}`, {
      method: "DELETE",
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete user" },
      { status: 500 }
    );
  }
}
