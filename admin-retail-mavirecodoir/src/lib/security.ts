const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  options?: { maxAttempts?: number; windowMs?: number }
): boolean {
  const { maxAttempts = 10, windowMs = 60_000 } = options || {};
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

export function getClientIp(request: { headers: { get: (name: string) => string | null } }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function validateOrigin(request: { headers: { get: (name: string) => string | null } }): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return true;
    if (originUrl.hostname === "localhost") return true;
    if (originUrl.hostname.endsWith(".mavirecodoir.com")) return true;
    return false;
  } catch {
    return false;
  }
}
