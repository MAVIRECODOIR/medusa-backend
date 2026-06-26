import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function handleCustomerCreated({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  const customer = event.data as any
  if (!customer?.id || !customer?.email) return

  try {
    const firstName = customer.first_name || "Valued Customer"

    await notificationService.createNotifications({
      to: customer.email,
      channel: "email",
      template: "customer.created",
      data: {
        customer_name: firstName,
        firstName,
      },
    })

    logger.info(`[welcome-customer] Welcome email queued for ${customer.email}`)
  } catch (err: any) {
    logger.error(`[welcome-customer] Failed for ${customer.email}: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}