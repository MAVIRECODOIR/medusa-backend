import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function handleOrderRefunded({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const paymentId = (event.data as any)?.id
  if (!paymentId) return

  try {
    const { data: payments } = await query.graph({
      entity: "payment",
      fields: ["id", "payment_collection_id", "amount"],
      filters: { id: paymentId },
    })

    const payment = payments?.[0] as Record<string, any> | undefined
    if (!payment?.payment_collection_id) return

    const remoteLink = container.resolve("remoteLink") as any
    const links = await remoteLink.resolve("payment_collection", payment.payment_collection_id, "order")
    if (!links?.length) return

    const orderId = links[0].order_id || links[0].id

    const { data: orders } = await query.graph({
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
      filters: { id: orderId },
    })

    const order = orders?.[0] as Record<string, any> | undefined
    if (!order?.email) {
      logger.warn(`[order-refunded] No email for order linked to payment ${paymentId}`)
      return
    }

    const currency = (order.currency_code as string) || "GBP"
    const firstName = order.customer?.first_name || "Valued Customer"

    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order.refund",
      data: {
        ...order,
        customer_name: firstName,
        firstName,
        orderNumber: String(order.display_id || ""),
        refundAmount: (payment.amount || 0) / 100,
        refundCurrency: currency.toUpperCase(),
      },
    })

    logger.info(`[order-refunded] Email queued for ${order.email} (order ${order.id}, refund £${(payment.amount || 0) / 100})`)
  } catch (err: any) {
    logger.error(`[order-refunded] Failed for payment ${paymentId}: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
}
