import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "status",
  "fulfillment_status",
  "payment_status",
  "total",
  "subtotal",
  "shipping_total",
  "tax_total",
  "discount_total",
  "currency_code",
  "created_at",
  "metadata",
  "*items",
  "*items.variant",
  "*items.variant.product",
  "*shipping_address",
  "*billing_address",
  "*shipping_methods",
  "*fulfillments",
  "*fulfillments.tracking_links",
]

async function getCustomerId(req: MedusaRequest): Promise<string | null> {
  try {
    const authModule = req.scope.resolve(Modules.AUTH)
    const { auth_user_id } = (req as any).auth_context || {}
    if (!auth_user_id) return null

    const authIdentity = await authModule.retrieveAuthIdentity(auth_user_id)
    const appMetadata = authIdentity?.app_metadata || {}
    return (appMetadata as any).customer_id || null
  } catch {
    return null
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const tokenParam = (req.query.token as string) || ""

  if (!id) {
    return res.status(400).json({ error: "Order ID is required" })
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      filters: { id },
    })

    const order = data[0]
    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    const metadata = (order.metadata || {}) as Record<string, any>

    // 1. Token-based access
    if (tokenParam && metadata.access_token && tokenParam === metadata.access_token) {
      const { metadata: _, ...cleanOrder } = order
      return res.json({ order: cleanOrder })
    }

    // 2. Session-based access — customer owns this order
    const customerId = await getCustomerId(req)
    if (customerId && order.customer_id === customerId) {
      const { metadata: _, ...cleanOrder } = order
      return res.json({ order: cleanOrder })
    }

    // 3. Not authorized
    return res.status(404).json({ error: "Order not found" })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" })
  }
}
