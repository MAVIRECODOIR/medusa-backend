import { cookies } from "next/headers";
import { siteConfig } from "./config";

export async function adminFetch<T = unknown>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const token = (await cookies()).get("_admin_token")?.value;

  const url = new URL(`${siteConfig.medusaBackendUrl}${path}`);
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Medusa API ${res.status} ${path}: ${body}`);
  }

  return res.json();
}
