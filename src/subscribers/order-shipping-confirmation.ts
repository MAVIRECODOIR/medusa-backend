import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function handleFulfillmentCreated({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = container.resolve("remoteLink") as any

  const fulfillmentId = (event.data as any)?.id
  if (!fulfillmentId) return

  try {
    const links = await remoteLink.resolve("fulfillment", fulfillmentId, "order")
    if (!links?.length) return

    const orderId = links[0].order_id || links[0].id
    if (!orderId) return

    const [fulfillmentResult, orderResult] = await Promise.all([
      query.graph({
        entity: "fulfillment",
        fields: ["id", "tracking_numbers", "tracking_links.*", "provider_id", "data"],
        filters: { id: fulfillmentId },
      }),
      query.graph({
        entity: "order",
        fields: [
          "display_id",
          "email",
          "customer.first_name",
          "shipping_methods.name",
        ],
        filters: { id: orderId },
      }),
    ])

    const fulfillment = fulfillmentResult.data?.[0] as Record<string, any> | undefined
    const order = orderResult.data?.[0] as Record<string, any> | undefined

    if (!order?.email) {
      logger.warn(`[order-shipping] No email for order ${orderId}`)
      return
    }

    const fulfillmentData = (fulfillment?.data || {}) as Record<string, any>
    const carrier = fulfillmentData.shippo_carrier
      || fulfillmentData.carrier
      || fulfillment?.provider_id
      || order?.shipping_methods?.[0]?.name
      || "Mail Carrier"

    const trackingNumbers = fulfillment?.tracking_numbers || []
    const trackingLinks = fulfillment?.tracking_links || []
    
    const trackingNumber = fulfillmentData.shippo_tracking_number
      || trackingNumbers[0]
      || trackingLinks[0]?.tracking_number
      || ""
    
    const trackingUrl = fulfillmentData.shippo_tracking_url
      || trackingLinks[0]?.url
      || ""

    const firstName = order.customer?.first_name || "Valued Customer"

    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "fulfillment.created",
      data: {
        firstName,
        orderNumber: String(order.display_id || ""),
        carrier,
        trackingNumber,
        trackingUrl,
        estimatedDelivery: "3–5 business days",
      },
    })

    logger.info(`[order-shipping] Email queued for ${order.email} (order ${orderId})`)
  } catch (err: any) {
    logger.error(`[order-shipping] Failed for fulfillment ${fulfillmentId}: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "fulfillment.created",
}
