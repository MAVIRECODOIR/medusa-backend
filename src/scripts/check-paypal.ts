import { MedusaContainer } from "@medusajs/framework/types";

export default async function checkPaypal({ container }: { container: MedusaContainer }) {
  const query = container.resolve("query");
  const { data } = await query.graph({
    entity: "paypal_onboarding",
    fields: ["*"],
  });
  console.log("PayPal onboarding data:", JSON.stringify(data, null, 2));
}
