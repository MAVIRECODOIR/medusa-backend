import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, generateJwtToken } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email } = req.body as { email?: string }

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data: identities } = await query.graph({
      entity: "auth_identity",
      fields: [
        "id",
        "app_metadata",
        "provider_identities.id",
        "provider_identities.entity_id",
        "provider_identities.provider",
        "provider_identities.user_metadata",
      ],
      filters: {
        provider_identities: {
          entity_id: email.toLowerCase().trim(),
          provider: "emailpass",
        },
      },
    })

    if (!identities.length) {
      return res.status(404).json({ error: "Account not found" })
    }

    const authIdentity = identities[0] as any
    const providerIdentity = authIdentity.provider_identities?.[0]
    const customerId = authIdentity.app_metadata?.customer_id

    const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    const { http } = config.projectConfig

    const token = generateJwtToken(
      {
        actor_id: customerId ?? "",
        actor_type: "customer",
        auth_identity_id: authIdentity.id,
        auth_provider: "emailpass",
        app_metadata: {
          ...(authIdentity.app_metadata ?? {}),
          customer_id: customerId,
        },
        user_metadata: providerIdentity?.user_metadata ?? {},
      },
      {
        secret: http.jwtSecret,
        expiresIn: http.jwtExpiresIn || "15m",
      }
    )

    return res.json({ token })
  } catch (err: any) {
    console.error("[custom/otp-login] Error:", err?.message ?? err)
    return res.status(500).json({ error: err?.message ?? "Unknown error" })
  }
}
