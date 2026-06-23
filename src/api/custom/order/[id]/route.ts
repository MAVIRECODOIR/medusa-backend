import jwt from "jsonwebtoken"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "customer_id",
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
  "items",
  "items.variant",
  "items.variant.product",
  "shipping_address",
  "billing_address",
  "shipping_methods",
  "fulfillments",
  "fulfillments.labels",
  "payments",
]

function maskEmail(email: string): string {
  const [name, domain] = email.split("@")
  if (!domain) return email
  if (name.length <= 2) return name[0] + "*".repeat(name.length - 1) + "@" + domain
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1] + "@" + domain
}

function isTokenExpired(metadata: Record<string, any>): boolean {
  const expiresAt = metadata.access_token_expires_at
  if (!expiresAt) return false
  return Date.now() > new Date(expiresAt).getTime()
}

async function getCustomerId(req: MedusaRequest): Promise<string | null> {
  try {
    const configModule = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as any
    const jwtSecret = configModule?.projectConfig?.http?.jwtSecret
    if (!jwtSecret) return null

    const authHeader = req.headers.authorization as string | undefined
    if (!authHeader) return null

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) return null

    const decoded = jwt.verify(token, jwtSecret) as any
    if (decoded?.actor_type === "customer" && decoded?.actor_id) {
      return decoded.actor_id
    }
    if (decoded?.auth_user_id) {
      const authModule = req.scope.resolve(Modules.AUTH)
      try {
        const authIdentity = await authModule.retrieveAuthIdentity(decoded.auth_user_id)
        const appMetadata = authIdentity?.app_metadata || {}
        return (appMetadata as any).customer_id || null
      } catch {
        return null
      }
    }
    return null
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
    // Use the standard Medusa order module service
    const orderModule = req.scope.resolve(Modules.ORDER)
    
    // Try using retrieveOrder with relations only (no select to ensure all fields are returned)
    const orderData = await orderModule.retrieveOrder(
      id,
      {
        relations: ["items", "items.variant", "items.variant.product", "shipping_address", "billing_address", "shipping_methods", "fulfillments", "fulfillments.labels", "payments"],
      }
    ) as any

    if (!orderData) {
      console.error(`Order not found for ID: ${id}`)
      return res.status(404).json({ error: "Order not found" })
    }

    // Transform fulfillments labels to tracking_links for frontend compatibility
    if (orderData.fulfillments) {
      orderData.fulfillments = orderData.fulfillments.map((fulfillment: any) => ({
        ...fulfillment,
        tracking_links: fulfillment.labels?.map((label: any) => ({
          id: label.id,
          tracking_number: label.tracking_number,
          url: label.tracking_url,
        })) || [],
        tracking_numbers: fulfillment.labels?.map((label: any) => label.tracking_number) || [],
      }))
    }

    const metadata = (orderData.metadata || {}) as Record<string, any>

    // 1. Token-based access
    if (tokenParam && metadata.access_token && tokenParam === metadata.access_token) {
      if (isTokenExpired(metadata)) {
        return res.status(401).json({ error: "Access link has expired. Please request a new one." })
      }
      const orderEmail = orderData.email || ""
      const emailParam = (req.query.email as string) || ""
      if (emailParam && emailParam.toLowerCase() === orderEmail.toLowerCase()) {
        const { metadata: _, ...cleanOrder } = orderData
        return res.json({ order: cleanOrder })
      }
      return res.json({ masked_email: maskEmail(orderEmail), verified: false })
    }

    // 2. Session-based access — customer owns this order
    const customerId = await getCustomerId(req)
    if (customerId && orderData.customer_id === customerId) {
      const { metadata: _, ...cleanOrder } = orderData
      return res.json({ order: cleanOrder })
    }

    // 3. Not authorized
    return res.status(404).json({ error: "Order not found" })
  } catch (err: any) {
    console.error("Error fetching order:", err)
    return res.status(500).json({ error: err?.message ?? "Unknown error" })
  }
}
