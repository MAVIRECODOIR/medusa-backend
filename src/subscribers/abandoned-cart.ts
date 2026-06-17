import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { BrevoClient } from "@getbrevo/brevo";

export default async function abandonedCartHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger");
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) return;

  const client = new BrevoClient({ apiKey: brevoApiKey });
  const cart = event.data as any;

  const email = cart.email || cart.customer?.email;
  const items = cart.items || [];
  if (!email || items.length === 0) return;

  try {
    await client.event.createEvent({
      event_name: "cart_abandoned",
      identifiers: { email_id: email },
      event_properties: {
        cart_id: cart.id,
        cart_total: cart.total || 0,
        item_count: items.length,
        currency: cart.currency_code || "GBP",
      },
    } as any);
    logger.info(`Brevo cart_abandoned event sent for ${email} (cart: ${cart.id})`);
  } catch (err: any) {
    logger.error(`Brevo cart_abandoned event failed: ${err.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "cart.customer_updated",
};
