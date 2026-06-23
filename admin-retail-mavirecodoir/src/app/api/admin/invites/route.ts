import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

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
