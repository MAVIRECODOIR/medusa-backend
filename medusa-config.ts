import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  // ── Plugins (third-party integrations) ──
  plugins: [
    {
      resolve: "@alphabite/medusa-paypal",
      options: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        isSandbox: process.env.PAYPAL_IS_SANDBOX === "true",
        webhookId: process.env.PAYPAL_WEBHOOK_ID,
      },
    },
    {
      resolve: "medusa-plugin-veeqo",
      options: {
        apiKey: process.env.VEEQO_API_KEY,
      },
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
        jwt_secret: process.env.JWT_SECRET || "supersecret",
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
            },
          },
          {
            resolve: "@alphabite/medusa-paypal/providers/paypal",
            id: "paypal",
            options: {
              clientId: process.env.PAYPAL_CLIENT_ID,
              clientSecret: process.env.PAYPAL_CLIENT_SECRET,
              isSandbox: process.env.PAYPAL_IS_SANDBOX === "true",
              webhookId: process.env.PAYPAL_WEBHOOK_ID,
            },
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
            channels: ["email"],
            options: {
              brevoApiKey: process.env.BREVO_API_KEY,
              resendApiKey: process.env.RESEND_API_KEY,
              from: process.env.BREVO_FROM,
              senderName: process.env.BREVO_SENDER_NAME,
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
    // ── Sales Channel ──
    {
      key: Modules.SALES_CHANNEL,
      resolve: "@medusajs/sales-channel",
    },
  ],
});
