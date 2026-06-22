import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BrevoClient } from "@getbrevo/brevo"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = (req.body || {}) as Record<string, any>

  if (!product_id) {
    return res.status(400).json({ message: "product_id is required" })
  }

  const brevoApiKey = process.env.BREVO_API_KEY
  const storeUrl = process.env.STORE_URL || "https://www.mavirecodoir.com"
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const service: any = req.scope.resolve("stock_interest")

  const registrations = await service.listInterestRegistrations({
    product_id,
    notified_at: null,
  })

  if (registrations.length === 0) {
    return res.json({ message: "No pending registrations for this product", notified: 0 })
  }

  // Get product + variant info for email
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: [
      "id", "title", "sku",
      "product.id", "product.title", "product.handle",
      "images.id", "images.url",
    ],
    filters: { product_id },
  })

  let notifiedCount = 0

  for (const reg of registrations) {
    try {
      if (brevoApiKey && variants?.length) {
        const variant = variants.find((v: any) => v.id === reg.variant_id) || variants[0]
        const productTitle = variant?.product?.title || "Product"
        const productHandle = variant?.product?.handle || ""
        const productUrl = `${storeUrl}/products/${productHandle}`
        const thumb = variant?.images?.[0]?.url || ""

        const brevo = new BrevoClient({ apiKey: brevoApiKey })
        await brevo.transactionalEmails.sendTransacEmail({
          to: [{ email: reg.email }],
          templateId: 3,
          params: {
            product_title: productTitle,
            product_url: productUrl,
            variant_title: variant?.title || "",
            product_image: thumb,
          },
        } as any)
      }

      await service.updateInterestRegistrations(reg.id, {
        notified_at: new Date(),
      })
      notifiedCount++
    } catch {
      // continue to next registration
    }
  }

  res.json({
    message: `Notified ${notifiedCount} customers`,
    notified: notifiedCount,
  })
}
