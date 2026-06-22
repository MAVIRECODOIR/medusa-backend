import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/medusa-admin";

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

const PORTAL_ROLES = ["retail_staff", "admin"];

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const client = createAdminClient();
    const result = await client.auth.login(email, password);

    const token = result.token;

    const authedClient = createAdminClient(token);
    const userResult = await authedClient.users.getMe();
    const user = userResult.user;

    const role = user.metadata?.role || "admin";

    if (!PORTAL_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "This account does not have portal access" },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: { email: user.email, role },
    });

    response.cookies.set("_admin_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
