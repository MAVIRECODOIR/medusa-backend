import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/medusa-admin";
import { checkRateLimit, getClientIp, validateOrigin } from "@/lib/security";

const PORTAL_ROLES: string[] = [
  "admin", "manager", "staff", "support", "viewer",
  "retail_staff",
];

export async function POST(request: Request) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ip = getClientIp(request);
  if (!checkRateLimit(ip, { maxAttempts: 5, windowMs: 60_000 })) {
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
