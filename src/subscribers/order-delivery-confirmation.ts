import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function handleDeliveryCreated({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const remoteLink = container.resolve("remoteLink") as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const fulfillmentId = (event.data as any)?.id
  if (!fulfillmentId) return

  try {
    const links = await remoteLink.resolve("fulfillment", fulfillmentId, "order")
    if (!links?.length) {
      logger.info(`[order-delivery] No linked order for fulfillment ${fulfillmentId}`)
      return
    }

    const orderId = links[0].order_id || links[0].id
    if (!orderId) return

    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "items.id",
        "items.title",
        "items.quantity",
        "items.thumbnail",
        "items.variant.title",
        "customer.first_name",
      ],
      filters: { id: orderId },
    })

    const order = data?.[0] as Record<string, any> | undefined
    if (!order?.email) {
      logger.warn(`[order-delivery] No email for order ${orderId}`)
      return
    }

    const firstName = order.customer?.first_name || "Valued Customer"

    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order.delivered",
      data: {
        ...order,
        customer_name: firstName,
        firstName,
        orderNumber: String(order.display_id || ""),
      },
    })

    logger.info(`[order-delivery] Delivery confirmation queued for ${order.email} (order ${orderId})`)
  } catch (err: any) {
    logger.error(`[order-delivery] Failed for fulfillment ${fulfillmentId}: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}