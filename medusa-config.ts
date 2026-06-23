import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000,http://localhost:5173,https://www.mavirecodoir.com",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:7001,https://admin-backend.mavirecodoir.com",
      authCors: process.env.AUTH_CORS || "http://localhost:3000,http://localhost:5173,http://localhost:9000,https://www.mavirecodoir.com,https://admin-backend.mavirecodoir.com,https://api.mavirecodoir.com,https://docs.medusajs.com",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: {
    maxUploadFileSize: 100 * 1024 * 1024,
  },
  // ── Plugins (third-party integrations) ──
  plugins: [
    {
      resolve: "@easypayment/medusa-payment-paypal",
      options: {},
    },
  ],
  modules: [
    // ── Product ──
    {
      key: Modules.PRODUCT,
      resolve: "@medusajs/product",
    },
    // ── Auth ──
    {
      resolve: "@medusajs/auth",
      key: "auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/auth-emailpass",
            id: "emailpass",
          },
        ],
      },
    },
    // ── User ──
    {
      resolve: "@medusajs/user",
      key: "user",
      options: {
        jwt_secret: process.env.JWT_SECRET,
      },
    },
    // ── Customer ──
    {
      key: Modules.CUSTOMER,
      resolve: "@medusajs/customer",
    },
    // ── Payment ──
    {
      key: Modules.PAYMENT,
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              paymentDescription: "Mavire Codoir",
              capture: true,
            },
          },
          {
            resolve: "@easypayment/medusa-payment-paypal/providers/paypal",
            id: "paypal",
            options: {},
            dependencies: ["paypal_onboarding"],
          },
          {
            resolve: "@easypayment/medusa-payment-paypal/providers/paypal_card",
            id: "paypal_card",
            options: {},
            dependencies: ["paypal_onboarding"],
          },
        ],
      },
    },
    // ── Fulfillment (manual provider for checkout shipping options) ──
    {
      key: Modules.FULFILLMENT,
      resolve: "@medusajs/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/fulfillment-manual",
            id: "manual",
          },
        ],
      },
    },
    // ── Notifications (Brevo for customer-facing) ──
    {
      key: Modules.NOTIFICATION,
      resolve: "@medusajs/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/brevo",
            id: "brevo",
            options: {
              channels: ["email"],
              brevoApiKey: process.env.BREVO_API_KEY,
              resendApiKey: process.env.RESEND_API_KEY,
              from: process.env.BREVO_FROM,
              senderName: process.env.BREVO_SENDER_NAME,
              store_url: process.env.STORE_URL || "https://mavirecodoir.com",
            },
          },
        ],
      },
    },
    // ── Production Infrastructure (requires Redis) ──
    {
      resolve: "@medusajs/cache-redis",
      key: "cache_redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/event-bus-redis",
      key: "event_bus_redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/locking",
      key: "locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/locking-redis",
            id: "locking-redis",
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
        ],
      },
    },
    // ── Sales Channel ──
    {
      key: Modules.SALES_CHANNEL,
      resolve: "@medusajs/sales-channel",
    },
    // ── File upload (S3-compatible / Cloudflare R2) ──
    {
      key: Modules.FILE,
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              maxFileSize: 100 * 1024 * 1024,
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
            },
          },
        ],
      },
    },
    // ── Stock Interest (demand-led production) ──
    {
      resolve: "./src/modules/stock-interest",
      key: "stock_interest",
    },
    // ── Pre-Orders ──
    {
      resolve: "./src/modules/pre-order",
      key: "pre_order",
    },
    // ── Support Tickets ──
    {
      resolve: "./src/modules/support-ticket",
      key: "support_ticket",
    },
    // ── Audit Log (notifications & change history) ──
    {
      resolve: "./src/modules/audit-log",
      key: "audit_log",
    },
    // ── Shippo Shipping Integration ──
    {
      resolve: "./src/modules/shippo",
      key: "shippo",
      options: {
        apiKey: process.env.SHIPPO_API_KEY,
      },
    },
  ],
});
