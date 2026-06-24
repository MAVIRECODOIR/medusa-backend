import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/admin-fetch";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const data = await adminFetch(`/admin/invites/${params.id}/resend`, {
      method: "POST",
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Invite resend error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resend invite" },
      { status: 500 }
    );
  }
}
