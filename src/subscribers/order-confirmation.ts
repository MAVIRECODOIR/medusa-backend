import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatShippingAddress(addr: any): string {
  if (!addr) return ""
  const parts = [
    `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
    addr.address_1,
    addr.address_2,
    `${addr.city || ""}${addr.province ? `, ${addr.province}` : ""} ${addr.postal_code || ""}`.trim(),
    addr.country_code?.toUpperCase(),
  ].filter(Boolean)
  return parts.join("<br>")
}

export default async function handleOrderConfirmation({ event, container }: SubscriberArgs) {
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
        "created_at",
        "currency_code",
        "subtotal",
        "shipping_total",
        "tax_total",
        "discount_total",
        "total",
        "items.id",
        "items.title",
        "items.quantity",
        "items.unit_price",
        "items.thumbnail",
        "items.variant.title",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.province",
        "shipping_address.postal_code",
        "shipping_address.country_code",
        "customer.first_name",
      ],
      filters: { id: rawId },
    })

    const order = data?.[0] as Record<string, any> | undefined
    if (!order?.email) {
      logger.warn(`[order-confirmation] No email for order ${rawId}`)
      return
    }

    const currency = (order.currency_code as string) || "GBP"
    const firstName = order.customer?.first_name || "Valued Customer"

    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order.placed",
      data: {
        ...order,
        customer_name: firstName,
        firstName,
        orderNumber: String(order.display_id || ""),
        subtotal: formatPrice(order.subtotal || 0, currency),
        shipping: formatPrice(order.shipping_total || 0, currency),
        total: formatPrice(order.total || 0, currency),
        shippingAddress: formatShippingAddress(order.shipping_address),
        estimatedDelivery: "3–5 business days",
      },
    })

    logger.info(`[order-confirmation] Email queued for ${order.email} (order ${order.id})`)
  } catch (err: any) {
    logger.error(`[order-confirmation] Failed for ${rawId}: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
