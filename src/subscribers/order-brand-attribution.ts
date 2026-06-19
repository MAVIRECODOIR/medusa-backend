import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function handleOrderPlaced({ event, container }: SubscriberArgs) {
  const logger = container.resolve<{ info: (msg: string) => void; error: (msg: string) => void }>(ContainerRegistrationKeys.LOGGER);
  const orderModuleService = container.resolve(Modules.ORDER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

  const order = event.data as any;
  if (!order?.id) return;

  try {
    const existing = await orderModuleService.retrieveOrder(order.id, {
      select: ["id", "sales_channel_id", "metadata"],
    });

    if (!existing) return;

    const salesChannelId = order.sales_channel_id || existing.sales_channel_id;
    let brand = "Mavire Codoir";
    let domain = "www.mavirecodoir.com";
    let orderSource = "storefront";

    if (salesChannelId) {
      const channels = await salesChannelModuleService.listSalesChannels({ id: salesChannelId });
      const sc = channels?.[0];
      if (sc?.metadata) {
        brand = (sc.metadata as any).brand || brand;
        domain = (sc.metadata as any).domain || domain;
        orderSource = (sc.metadata as any).order_source || orderSource;
      }
    }

    await orderModuleService.updateOrders(existing.id, {
      metadata: {
        ...(existing.metadata || {}),
        brand,
        domain,
        sales_channel: salesChannelId,
        payment_provider: (order as any).payment_collection?.payment_sessions?.[0]?.provider_id || "",
        order_source: orderSource,
      },
    });

    logger.info(`order-brand-attribution: Injected brand metadata for order ${existing.id}`);
  } catch (e: any) {
    logger.error(`order-brand-attribution: ${e.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
