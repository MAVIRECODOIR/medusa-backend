import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function veeqoOrderSyncHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = (event.data as any)?.id
  if (!orderId) return

  try {
    const { syncOrderToVeeqoWorkflow } = await import(
      "medusa-plugin-veeqo/workflows/order"
    ).catch(() => ({ syncOrderToVeeqoWorkflow: null }))

    if (!syncOrderToVeeqoWorkflow) {
      logger.warn("[veeqo-order] Workflow not available — plugin may not be installed")
      return
    }

    await syncOrderToVeeqoWorkflow(container).run({ input: orderId })
    logger.info(`[veeqo-order] Synced order ${orderId} to Veeqo`)
  } catch (e: any) {
    if (e.message?.includes?.("INVALID_DATA") || e.message?.includes?.("missing required fields")) {
      logger.warn(`[veeqo-order] Order ${orderId} skipped — missing Veeqo mappings: ${e.message}`)
    } else {
      logger.error(`[veeqo-order] Failed for order ${orderId}: ${e.message}`)
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
