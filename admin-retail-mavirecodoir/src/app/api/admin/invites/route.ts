import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") || "50";
    const offset = searchParams.get("offset") || "0";
    
    const data = await adminFetch(`/admin/invites?limit=${limit}&offset=${offset}`);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Invites fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch invites" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Creating invite with body:", body);
    const data = await adminFetch("/admin/invites", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Invite creation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create invite" },
      { status: 500 }
    );
  }
}
