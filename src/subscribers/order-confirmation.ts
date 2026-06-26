import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

const COUNTRY_NAMES: Record<string, string> = {
  GB: "United Kingdom", US: "United States", FR: "France", IT: "Italy",
  DE: "Germany", ES: "Spain", NL: "Netherlands", BE: "Belgium",
  CH: "Switzerland", AT: "Austria", IE: "Ireland", DK: "Denmark",
  SE: "Sweden", NO: "Norway", FI: "Finland", PT: "Portugal",
  AE: "United Arab Emirates", SA: "Saudi Arabia", QA: "Qatar",
  KW: "Kuwait", BH: "Bahrain", OM: "Oman", JO: "Jordan",
  AU: "Australia", NZ: "New Zealand", SG: "Singapore", HK: "Hong Kong",
  JP: "Japan", KR: "South Korea", CN: "China", IN: "India",
  CA: "Canada", MX: "Mexico", BR: "Brazil", AR: "Argentina",
  ZA: "South Africa", RU: "Russia", TR: "Turkey", IL: "Israel",
}

function formatShippingAddress(addr: any): string {
  if (!addr) return ""
  const parts = [
    `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
    addr.address_1,
    addr.address_2,
    `${addr.city || ""}${addr.province ? `, ${addr.province}` : ""} ${addr.postal_code || ""}`.trim(),
    addr.country_code ? COUNTRY_NAMES[addr.country_code.toUpperCase()] || addr.country_code.toUpperCase() : "",
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
        "metadata",
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
        packagingType: order.metadata?.packaging_type || "signature",
        packagingLabel: order.metadata?.packaging_type === "eco" ? "Eco Packaging" : "Signature Packaging",
        giftPackaging: order.metadata?.gift_packaging === "true",
        giftLabel: order.metadata?.gift_packaging === "true" ? "Offered as a gift" : "",
        giftMessage: order.metadata?.gift_message || "",
        packagingHtml: (() => {
          const pkg = order.metadata?.packaging_type === "eco" ? "Eco Packaging" : "Signature Packaging";
          const gift = order.metadata?.gift_packaging === "true";
          const msg = order.metadata?.gift_message || "";
          let h = `<tr><td style="padding:0;font-size:11px;color:#999;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.08em;">Packaging</td><td style="padding:0;font-size:13px;color:#1A1A1A;text-align:right;">${pkg}</td></tr>`;
          if (gift) {
            h += `<tr><td style="padding-top:8px;font-size:11px;color:#999;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.08em;">Gift</td><td style="padding-top:8px;font-size:13px;color:#1A1A1A;text-align:right;">Offered as a gift</td></tr>`;
            if (msg) {
              h += `<tr><td colspan="2" style="padding-top:8px;font-size:12px;color:#666;font-style:italic;text-align:center;">&ldquo;${msg.replace(/"/g, "&quot;")}&rdquo;</td></tr>`;
            }
          }
          return h;
        })(),
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
