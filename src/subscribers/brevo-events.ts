import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { BrevoClient } from "@getbrevo/brevo";

const BREVO_BASE = "https://api.brevo.com/v3";

async function updateTotalSpent(client: BrevoClient, email: string, orderTotal: number) {
  try {
    const contact = await (client.contacts.getContactInfo as any)(email);
    const currentTotal = contact.attributes?.TOTAL_SPENT || 0;
    const newTotal = Number(currentTotal) + Number(orderTotal);
    await (client.contacts.updateContact as any)(email, {
      attributes: { TOTAL_SPENT: newTotal },
    });
  } catch {
    await (client.contacts.updateContact as any)(email, {
      attributes: { TOTAL_SPENT: Number(orderTotal) },
    });
  }
}

export default async function brevoEventHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger");
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) return;

  const client = new BrevoClient({ apiKey: brevoApiKey });
  const data = event.data as any;

  const eventConfig: Record<string, (d: any) => { event_name: string; properties: Record<string, any> }> = {
    "order.placed": (d) => ({
      event_name: "order_placed",
      properties: {
        order_id: d.id,
        total: d.total || 0,
        currency: d.currency_code || "GBP",
        email: d.email,
        first_name: d.customer?.first_name || "",
        item_count: d.items?.length || 0,
      },
    }),
    "fulfillment.created": (d) => ({
      event_name: "order_shipped",
      properties: {
        order_id: d.order_id || d.id,
        fulfillment_id: d.id,
        email: d.email || d.order?.email || "",
      },
    }),
    "order.canceled": (d) => ({
      event_name: "order_cancelled",
      properties: {
        order_id: d.id,
        email: d.email || d.customer?.email || "",
      },
    }),
    "draft.created": (d) => ({
      event_name: "draft_order_created",
      properties: {
        draft_id: d.id,
        total: d.total || 0,
        currency: d.currency_code || "GBP",
        email: d.email,
        first_name: d.customer?.first_name || "",
        item_count: d.items?.length || 0,
        created_by: d.created_by || "admin",
      },
    }),
    "draft.updated": (d) => ({
      event_name: "draft_order_updated",
      properties: {
        draft_id: d.id,
        total: d.total || 0,
        email: d.email,
        status: d.status || "open",
      },
    }),
    "promotion.applied": (d) => ({
      event_name: "promotion_used",
      properties: {
        promotion_id: d.id,
        promotion_code: d.code || "",
        discount_amount: d.amount || 0,
        order_id: d.order_id,
        email: d.email,
      },
    }),
    "campaign.started": (d) => ({
      event_name: "campaign_started",
      properties: {
        campaign_id: d.id,
        campaign_name: d.name,
        start_date: d.starts_at,
        end_date: d.ends_at,
      },
    }),
  };

  const handler = eventConfig[event.name as string];
  if (!handler) return;

  try {
    const { event_name, properties } = handler(data);
    const email = properties.email as string;
    if (!email) return;

    await client.event.createEvent({
      event_name,
      identifiers: { email_id: email },
      event_properties: properties,
    } as any);

    if (event_name === "order_placed") {
      await updateTotalSpent(client, email, properties.total);

      try {
        const brevoProducts = (data.items || []).map((item: any) => ({
          id: item.variant?.product_id || item.variant_id || item.id,
          name: item.title || item.variant?.title || "Product",
          sku: item.variant?.sku || "",
          quantity: item.quantity || 1,
          price: item.unit_price || 0,
        }));
        const res = await fetch(`${BREVO_BASE}/orders`, {
          method: "POST",
          headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.id, email, amount: data.total || 0,
            products: brevoProducts,
            createdAt: data.created_at || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
            status: "placed", isProcessed: false,
          }),
        });
        if (res.ok) logger.info(`Brevo order synced: ${data.id}`);
      } catch {} // order sync is optional (free plan doesn't support ecommerce)
    }
  } catch (err: any) {
    logger.error(`Brevo event failed: ${err.message}`);
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "fulfillment.created", "order.canceled", "draft.created", "draft.updated", "promotion.applied", "campaign.started"],
};
