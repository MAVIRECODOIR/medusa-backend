export const siteConfig = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "MAVIRE CODOIR Admin",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
  medusaBackendUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  adminApiSecret: process.env.ADMIN_API_SECRET || "",
  cookieSecret: process.env.COOKIE_SECRET || "fallback-dev-secret-do-not-use-in-prod",
};
