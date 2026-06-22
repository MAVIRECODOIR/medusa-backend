import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function handleDeliveryCreated({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const remoteLink = container.resolve("remoteLink") as any;
  const orderModuleService = container.resolve(Modules.ORDER);

  const fulfillmentId = (event.data as any)?.id;
  if (!fulfillmentId) return;

  try {
    // Resolve the link between fulfillment and order to get the order ID
    const links = await remoteLink.resolve("fulfillment", fulfillmentId, "order");

    if (!links?.length) {
      logger.info(`delivery-created: No linked order for fulfillment ${fulfillmentId}`);
      return;
    }

    const orderId = links[0].order_id || links[0].id;
    if (!orderId) {
      logger.info(`delivery-created: No order_id in link for fulfillment ${fulfillmentId}`);
      return;
    }

    const existing = await orderModuleService.retrieveOrder(orderId, {
      select: ["id", "metadata"],
    });

    const metadata = (existing.metadata || {}) as Record<string, any>;

    if (!metadata.delivered_at) {
      await orderModuleService.updateOrders(existing.id, {
        metadata: {
          ...metadata,
          delivered_at: new Date().toISOString(),
        },
      });
      logger.info(`delivery-created: Stored delivered_at for order ${existing.id}`);
    }
  } catch (e: any) {
    logger.error(`delivery-created: ${e.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
};
