import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BrevoClient } from "@getbrevo/brevo"

export default async function backInStockHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const brevoApiKey = process.env.BREVO_API_KEY

  const data = event.data as any
  if (!data?.id) return

  try {
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: [
        "id", "title", "sku", "inventory_quantity", "manage_inventory",
        "product.id", "product.title", "product.handle",
        "prices.amount", "prices.currency_code",
        "images.id", "images.url",
      ],
      filters: { product_id: data.id },
    })

    if (!variants?.length) return

    const service: any = container.resolve("stock_interest")

    for (const variant of variants as any[]) {
      if (!variant.manage_inventory) continue
      if (variant.inventory_quantity <= 0) continue

      const registrations = await service.listInterestRegistrations({
        variant_id: variant.id,
        notified_at: null,
      })

      if (!registrations?.length) continue

      const productTitle = variant.product?.title || "Product"
      const productHandle = variant.product?.handle || ""
      const storeUrl = process.env.STORE_URL || "https://www.mavirecodoir.com"
      const productUrl = `${storeUrl}/products/${productHandle}`
      const thumb = variant.images?.[0]?.url || variant.product?.thumbnail || ""
      const price = variant.prices?.find((p: any) => p.currency_code === "GBP")?.amount || 0

      for (const reg of registrations) {
        try {
          if (brevoApiKey) {
            const brevo = new BrevoClient({ apiKey: brevoApiKey })
            await brevo.transactionalEmails.sendTransacEmail({
              to: [{ email: reg.email }],
              templateId: 3,
              params: {
                product_title: productTitle,
                product_url: productUrl,
                variant_title: variant.title,
                product_image: thumb,
                price: (price / 100).toFixed(2),
              },
              subject: `Back in Stock: ${variant.title} ${productTitle} — MAVIRE CODOIR`,
            } as any)
          }

          await service.updateInterestRegistrations(reg.id, {
            notified_at: new Date(),
          })

          logger.info(`Notified ${reg.email} about ${variant.title} (${productTitle})`)
        } catch (err: any) {
          logger.error(`Failed to notify ${reg.email}: ${err.message}`)
        }
      }
    }
  } catch (err: any) {
    logger.error(`Back-in-stock notifier failed: ${err.message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["product.updated", "inventory-level.updated"],
}
