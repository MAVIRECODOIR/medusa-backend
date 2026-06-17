import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email } = req.body as { email?: string }

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data } = await query.graph({
      entity: "provider_identity",
      fields: ["id"],
      filters: {
        entity_id: email.toLowerCase().trim(),
        provider: "emailpass",
      },
    })

    return res.json({ exists: data.length > 0 })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" })
  }
}
