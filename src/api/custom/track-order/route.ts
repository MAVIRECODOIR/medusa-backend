import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import crypto from "crypto"

export const AUTHENTICATE = false

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const displayId = req.query.display_id as string | undefined
  const email = req.query.email as string | undefined

  if (!displayId || !email) {
    return res.status(400).json({ error: "display_id and email are required" })
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "status",
        "total",
        "subtotal",
        "shipping_total",
        "tax_total",
        "discount_total",
        "currency_code",
        "created_at",
        "fulfillment_status",
        "payment_status",
        "metadata",
        "*items",
        "*items.variant",
        "*items.variant.product",
        "*shipping_address",
        "*billing_address",
        "*shipping_methods",
        "*fulfillments",
        "*fulfillments.tracking_links",
      ],
      filters: {
        display_id: displayId as any,
      },
    })

    const order = data[0]

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    if (order.email?.toLowerCase() !== email.toLowerCase().trim()) {
      return res.status(404).json({ error: "Order not found" })
    }

    // Ensure a token exists
    const metadata = (order.metadata || {}) as Record<string, any>
    let token = metadata.access_token as string | undefined
    if (!token) {
      token = crypto.randomBytes(32).toString("hex")
      const orderModuleService = req.scope.resolve(Modules.ORDER)
      await orderModuleService.updateOrders(order.id, {
        metadata: {
          ...metadata,
          access_token: token,
          access_token_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
      })
    }

    // Strip metadata from response
    const { metadata: _, ...safeOrder } = order

    return res.json({ order: safeOrder, token })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" })
  }
}
