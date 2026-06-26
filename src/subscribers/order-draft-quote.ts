import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function handleDraftCreated({ event, container }: SubscriberArgs) {
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
        "subtotal",
        "shipping_total",
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
      logger.warn(`[draft-quote] No email for draft order ${rawId}`)
      return
    }

    const currency = (order.currency_code as string) || "GBP"
    const firstName = order.customer?.first_name || "Valued Customer"

    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "draft.created",
      data: {
        ...order,
        customer_name: firstName,
        firstName,
        orderNumber: String(order.display_id || ""),
        orderUrl: `https://www.mavirecodoir.com/client/my-account`,
      },
    })

    logger.info(`[draft-quote] Quote email queued for ${order.email} (draft ${order.id})`)
  } catch (err: any) {
    logger.error(`[draft-quote] Failed for ${rawId}: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "draft.created",
}