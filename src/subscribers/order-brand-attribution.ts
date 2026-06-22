import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import crypto from "crypto";

export default async function handleOrderPlaced({ event, container }: SubscriberArgs) {
  const logger = container.resolve<{ info: (msg: string) => void; error: (msg: string) => void }>(ContainerRegistrationKeys.LOGGER);
  const orderModuleService = container.resolve(Modules.ORDER);
  const paymentModuleService = container.resolve(Modules.PAYMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

  const order = event.data as any;
  if (!order?.id) return;

  try {
    const existing = await orderModuleService.retrieveOrder(order.id, {
      select: ["id", "sales_channel_id", "metadata"],
    });

    if (!existing) return;

    // Generate a secure access token for order email links if not already set
    const existingMeta = (existing.metadata || {}) as Record<string, any>;
    const accessToken = existingMeta.access_token || crypto.randomBytes(32).toString("hex");

    const salesChannelId = order.sales_channel_id || existing.sales_channel_id;
    let brand = "Mavire Codoir";
    let sourceDomain = "mavirecodoir.com";
    let salesChannelLabel = "fashion";
    let orderSource = "storefront";

    if (salesChannelId) {
      const channels = await salesChannelModuleService.listSalesChannels({ id: salesChannelId });
      const sc = channels?.[0];
      if (sc?.metadata) {
        brand = (sc.metadata as any).brand || brand;
        sourceDomain = (sc.metadata as any).domain?.replace(/^www\./, "") || sourceDomain;
        orderSource = (sc.metadata as any).order_source || orderSource;
      }
    }

    const paymentSession = (order as any).payment_collection?.payment_sessions?.[0];
    const providerId = paymentSession?.provider_id || "";
    const paymentProvider = providerId.includes("paypal") ? "paypal" : providerId.includes("stripe") ? "stripe" : providerId;
    const paymentReference = paymentSession?.data?.id || paymentSession?.data?.payment_intent?.id || "";

    await orderModuleService.updateOrders(existing.id, {
      metadata: {
        ...(existing.metadata || {}),
        brand,
        source_domain: sourceDomain,
        sales_channel: salesChannelLabel,
        payment_provider: paymentProvider,
        payment_reference: paymentReference,
        order_source: orderSource,
        access_token: accessToken,
      },
    });

    if (paymentSession?.id) {
      try {
        await paymentModuleService.updatePayment(paymentSession.id, {
          brand,
          source_domain: sourceDomain,
          order_id: existing.id,
        } as any);
      } catch {
        // Payment metadata update is non-critical
      }
    }

    logger.info(`order-brand-attribution: Injected metadata for order ${existing.id} (${paymentProvider})`);
  } catch (e: any) {
    logger.error(`order-brand-attribution: ${e.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
