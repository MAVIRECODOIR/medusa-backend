import { MedusaContainer } from "@medusajs/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const ABANDON_TIMEOUT_MS = 60 * 60 * 1000

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function buildItemsHtml(items: any[], currency: string): string {
  if (!items?.length) return ""
  return items.map((item: any) => {
    const imgUrl = item.thumbnail || ""
    const name = item.variant?.title
      ? `${item.title} — ${item.variant.title}`
      : (item.title || "Item")
    const qty = item.quantity ?? 0
    const unitPrice = item.unit_price ?? 0
    const lineTotal = unitPrice * qty
    const imgTag = imgUrl
      ? `<img src="${imgUrl}" width="48" height="64" alt="" style="display:inline-block;vertical-align:middle;margin-right:12px;object-fit:cover;border-radius:2px;">`
      : ""
    return `<tr>
<td style="padding:8px 0;font-size:13px;color:#1A1A1A;vertical-align:middle;">${imgTag}<span style="vertical-align:middle;">${name}</span></td>
<td style="padding:8px 0;font-size:13px;color:#666;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">${qty}</td>
<td style="padding:8px 0;font-size:13px;color:#1A1A1A;text-align:right;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">${formatPrice(lineTotal, currency)}</td>
</tr>`
  }).join("\n")
}

export default async function checkAbandonedCarts(container: MedusaContainer) {
  const logger = container.resolve<{ info: (msg: string) => void; error: (msg: string) => void }>(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const cartModuleService = container.resolve(Modules.CART)

  try {
    const now = new Date()

    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "email",
        "total",
        "currency_code",
        "created_at",
        "updated_at",
        "metadata",
        "items.id",
        "items.title",
        "items.quantity",
        "items.unit_price",
        "items.thumbnail",
        "items.variant.title",
      ],
      filters: {
        email: { $nin: [null, ""] },
      },
    })

    if (!carts?.length) {
      logger.info("[check-abandoned-carts] No carts with email found")
      return
    }

    let sent = 0

    for (const cart of carts as any[]) {
      if (!cart.items?.length) continue

      const lastActivity = new Date(cart.updated_at || cart.created_at).getTime()
      if (now.getTime() - lastActivity < ABANDON_TIMEOUT_MS) continue

      const meta = (cart.metadata || {}) as Record<string, any>
      if (meta.abandoned_notified_at) continue

      const currency = (cart.currency_code as string) || "GBP"
      const firstName = cart.email ? cart.email.split("@")[0].replace(/[._]/g, " ") : "Valued Customer"

      const itemsHtml = buildItemsHtml(cart.items, currency)
      if (!itemsHtml) continue

      await notificationService.createNotifications({
        to: cart.email,
        channel: "email",
        template: "abandoned-cart",
        data: {
          firstName,
          customer_name: firstName,
          itemCount: String(cart.items.length),
          itemsHtml,
          cartTotal: formatPrice(cart.total || 0, currency),
        },
      })

      try {
        await (cartModuleService as any).updateCarts(cart.id, {
          metadata: { ...meta, abandoned_notified_at: now.toISOString() },
        })
      } catch {
        // non-critical
      }

      sent++
      logger.info(`[check-abandoned-carts] Sent for ${cart.email} (cart ${cart.id})`)
    }

    logger.info(`[check-abandoned-carts] Complete: ${sent} abandoned cart emails sent`)
  } catch (err: any) {
    const logger = container.resolve<{ error: (msg: string) => void }>(ContainerRegistrationKeys.LOGGER)
    logger.error(`[check-abandoned-carts] Job failed: ${err.message}`)
  }
}

export const config = {
  name: "check-abandoned-carts",
  schedule: "0 */1 * * *",
}