import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth";

export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
