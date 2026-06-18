import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { email, product_id, variant_id, product_title, variant_title } = (req.body || {}) as Record<string, any>

    if (!email || !product_id) {
      return res.status(400).json({ message: "email and product_id are required" })
    }

    if (!email.includes("@")) {
      return res.status(400).json({ message: "Invalid email address" })
    }

    const service: any = req.scope.resolve("stock_interest")

    const existing = await service.listInterestRegistrations({
      email,
      product_id,
      ...(variant_id ? { variant_id } : {}),
    })

    if (existing.length > 0) {
      return res.status(200).json({ message: "Already registered", registration: existing[0] })
    }

    const registration = await service.createInterestRegistrations({
      email,
      product_id,
      variant_id: variant_id || null,
    })

    if (registration?.id && (variant_title || product_title)) {
      try {
        await service.updateInterestRegistrations(registration.id, {
          metadata: {
            variant_title: variant_title || null,
            product_title: product_title || null,
          },
        })
      } catch {
      }
    }

    try {
      const apiKey = process.env.BREVO_API_KEY
      if (apiKey) {
        const { BrevoClient } = await import("@getbrevo/brevo")
        const brevo = new BrevoClient({ apiKey })

        await brevo.contacts.createContact({
          email,
          attributes: {
            INTERESTED_PRODUCT: product_title || product_id,
            INTERESTED_VARIANT: variant_title || variant_id || "",
          },
          updateEnabled: true,
        })

        await brevo.event.createEvent({
          event_name: "back_in_stock_interest",
          identifiers: { email_id: email },
          event_properties: {
            product_id,
            variant_id: variant_id || null,
            variant_title: variant_title || "",
            product_title: product_title || "",
          },
        } as any)
      }
    } catch (brevoErr: any) {
      logger.error("Brevo stock-interest event failed", brevoErr)
    }

    return res.status(201).json({ registration })
  } catch (err: any) {
    logger.error("Stock-interest registration failed", err)
    return res.status(500).json({ message: "Failed to register interest", error: err.message })
  }
}
