import { SubscriberConfig, SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function handleGuestOrderLink({ event, container }: SubscriberArgs) {
  const logger = container.resolve<{ info: (msg: string) => void; error: (msg: string) => void }>(ContainerRegistrationKeys.LOGGER);
  const orderModuleService = container.resolve(Modules.ORDER);
  const customerModuleService = container.resolve(Modules.CUSTOMER);

  const order = event.data as any;
  if (!order?.id) return;

  try {
    if (order.customer_id) return;

    const email = order.email;
    if (!email) return;

    const customers = await customerModuleService.listCustomers({ email });
    if (!customers?.length) return;

    const existing = await orderModuleService.retrieveOrder(order.id, {
      select: ["id", "metadata"],
    });
    if (!existing) return;

    const existingMeta = (existing.metadata || {}) as Record<string, any>;
    if (existingMeta.linked_customer_id) return;

    const customer = customers[0];

    await orderModuleService.updateOrders(existing.id, {
      metadata: {
        ...existingMeta,
        linked_customer_id: customer.id,
        linked_at: new Date().toISOString(),
      },
    });

    logger.info(`guest-order-linker: Linked order ${existing.id} to customer ${customer.id} via email ${email}`);
  } catch (e: any) {
    logger.error(`guest-order-linker: ${e.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
