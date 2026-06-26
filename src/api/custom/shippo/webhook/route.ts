import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

interface ShippoWebhookBody {
  event?: string;
  object_id?: string;
  tracking_number?: string;
  tracking_status?: {
    status?: string;
    substatus?: string;
    status_date?: string;
    location?: { city?: string; state?: string; zip?: string; country?: string };
  };
  [key: string]: any;
}

async function resolveOrderFromTracking(
  req: MedusaRequest,
  trackingNumber: string
): Promise<{ order: any; fulfillment: any } | null> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const remoteLink = req.scope.resolve("remoteLink") as any;

  const { data: allFulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data"],
    filters: {},
  });

  const fulfillments = (allFulfillments || []).filter((f: any) => {
    const d = f.data || {};
    return d.shippo_tracking_number === trackingNumber;
  });

  if (!fulfillments?.length) return null;
  const fulfillment = fulfillments[0] as any;

  const links = await remoteLink.resolve("fulfillment", fulfillment.id, "order");
  if (!links?.length) return null;
  const orderId = links[0].order_id || links[0].id;

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "customer.first_name", "currency_code"],
    filters: { id: orderId },
  });

  if (!orders?.length) return null;
  return { order: orders[0], fulfillment };
}

async function handleOutForDelivery(req: MedusaRequest, body: ShippoWebhookBody) {
  const logger = req.scope.resolve<{ info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }>(ContainerRegistrationKeys.LOGGER);
  const notificationService = req.scope.resolve(Modules.NOTIFICATION);
  const trackingNumber = body.tracking_number;
  if (!trackingNumber) return;

  const resolved = await resolveOrderFromTracking(req, trackingNumber);
  if (!resolved) {
    logger.warn(`[Shippo/OutForDelivery] No fulfillment found for tracking ${trackingNumber}`);
    return;
  }

  const { order } = resolved;
  const firstName = (order as any).customer?.first_name || "Valued Customer";
  const fulfillmentData = resolved.fulfillment.data || {};

  const carrier = fulfillmentData.shippo_carrier || "Carrier";
  const trackingUrl = fulfillmentData.shippo_tracking_url || `https://shippo.com/track/${trackingNumber}`;

  const trackingHtml = `<tr><td style="padding:20px 40px 0;">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr><td class="dm-label" style="padding:4px 0;font-size:11px;color:#999;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.1em;">Carrier</td>
<td class="dm-value" style="padding:4px 0;font-size:13px;color:#1A1A1A;text-align:right;font-family:Arial,Helvetica,sans-serif;">${carrier}</td></tr>
<tr><td class="dm-label" style="padding:4px 0;font-size:11px;color:#999;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.1em;">Tracking</td>
<td class="dm-value" style="padding:4px 0;font-size:13px;color:#1A1A1A;text-align:right;font-family:Arial,Helvetica,sans-serif;">${trackingNumber}</td></tr>
</table>
</td></tr>`;

  try {
    await notificationService.createNotifications({
      to: (order as any).email,
      channel: "email",
      template: "out-for-delivery",
      data: {
        firstName,
        customer_name: firstName,
        orderNumber: String((order as any).display_id || ""),
        trackingNumber,
        trackingUrl,
        trackingHtml,
        carrier,
      },
    });
    logger.info(`[Shippo/OutForDelivery] Email sent for order ${(order as any).id} (${trackingNumber})`);
  } catch (err: any) {
    logger.error(`[Shippo/OutForDelivery] Failed: ${err.message}`);
  }
}

async function handleDelivered(req: MedusaRequest, body: ShippoWebhookBody) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const logger = req.scope.resolve<{ info: (m: string) => void; error: (m: string) => void }>(ContainerRegistrationKeys.LOGGER);
  const trackingNumber = body.tracking_number;
  if (!trackingNumber) return;

  const resolved = await resolveOrderFromTracking(req, trackingNumber);
  if (!resolved) return;

  const orderId = (resolved.order as any).id;
  const existingMeta = (resolved.order as any).metadata || {};

  try {
    const orderModuleService = req.scope.resolve(Modules.ORDER);
    await orderModuleService.updateOrders(orderId, {
      metadata: {
        ...existingMeta,
        delivered_at: new Date().toISOString(),
        delivered_via: "shippo_webhook",
      },
    });
    logger.info(`[Shippo/Webhook] Marked order ${orderId} as delivered`);
  } catch (err: any) {
    logger.error(`[Shippo/Webhook] Failed to update delivered_at for order ${orderId}: ${err.message}`);
  }
}

export async function POST(req: MedusaRequest<ShippoWebhookBody>, res: MedusaResponse) {
  try {
    const body = req.body || {};
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

    logger.info(`[Shippo Webhook] Event: ${body.event}, Tracking: ${body.tracking_number}, Status: ${body.tracking_status?.status}`);

    switch (body.event) {
      case "track_updated": {
        const status = body.tracking_status?.status;
        if (status === "OUT_FOR_DELIVERY") {
          await handleOutForDelivery(req, body);
        } else if (status === "DELIVERED") {
          await handleDelivered(req, body);
        }
        break;
      }
      case "transaction_created":
      case "transaction_updated":
      case "batch_created":
      case "batch_updated":
        break;
    }

    return res.json({ received: true });
  } catch (error: any) {
    console.error("[Shippo Webhook] Error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}