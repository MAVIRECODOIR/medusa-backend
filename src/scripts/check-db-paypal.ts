import { MedusaContainer } from "@medusajs/framework/types";

export default async function checkDbPaypal({ container }: { container: MedusaContainer }) {
  const pgConnection = container.resolve("__pg_connection__");
  try {
    const result = await pgConnection.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%paypal%' ORDER BY table_name");
    console.log("PayPal-related tables:", JSON.stringify(result.rows?.map((r: any) => r.table_name) ?? [], null, 2));
  } catch (e) {
    console.log("Query failed:", e?.message ?? String(e));
  }

  try {
    const result = await pgConnection.raw("SELECT id, environment, is_active, created_at FROM paypal_credential LIMIT 5");
    console.log("PayPal credentials:", JSON.stringify(result.rows ?? [], null, 2));
  } catch (e: any) {
    console.log("paypal_credential query:", e?.message ?? String(e));
  }

  try {
    const result = await pgConnection.raw("SELECT id, environment, data FROM paypal_onboarding LIMIT 5");
    console.log("PayPal onboarding:", JSON.stringify(result.rows ?? [], null, 2));
  } catch (e: any) {
    console.log("paypal_onboarding query:", e?.message ?? String(e));
  }

  try {
    const result = await pgConnection.raw("SELECT id, data FROM paypal_setting LIMIT 5");
    console.log("PayPal settings:", JSON.stringify(result.rows ?? [], null, 2));
  } catch (e: any) {
    console.log("paypal_setting query:", e?.message ?? String(e));
  }
}
