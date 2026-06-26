import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function handleOrderCancelled({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const rawId = (event.data as any)?.id
  if (!rawId) return

  try {
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "total",
        "items.id",
        "items.title",
        "items.quantity",
        "items.unit_price",
        "items.thumbnail",
        "items.variant.title",
        "customer.first_name",
      ],
      filters: { id: rawId },
    })

    const order = data?.[0] as Record<string, any> | undefined
    if (!order?.email) {
      logger.warn(`[order-cancelled] No email for order ${rawId}`)
      return
    }

    const currency = (order.currency_code as string) || "GBP"
    const firstName = order.customer?.first_name || "Valued Customer"

    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order.cancelled",
      data: {
        ...order,
        customer_name: firstName,
        firstName,
        orderNumber: String(order.display_id || ""),
      },
    })

    logger.info(`[order-cancelled] Email queued for ${order.email} (order ${order.id})`)
  } catch (err: any) {
    logger.error(`[order-cancelled] Failed for ${rawId}: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.cancelled",
}