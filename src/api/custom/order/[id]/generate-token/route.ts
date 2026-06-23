import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import crypto from "crypto"

export const AUTHENTICATE = false

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const body = req.body as { frontend_url?: string } | undefined

  if (!id) {
    return res.status(400).json({ error: "Order ID is required" })
  }

  try {
    const orderModuleService = req.scope.resolve(Modules.ORDER)

    const existing = await orderModuleService.retrieveOrder(id, {
      select: ["id", "metadata"],
    })

    if (!existing) {
      return res.status(404).json({ error: "Order not found" })
    }

    const token = crypto.randomBytes(32).toString("hex")

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    await orderModuleService.updateOrders(existing.id, {
      metadata: {
        ...(existing.metadata || {}),
        access_token: token,
        access_token_expires_at: expiresAt,
        frontend_url: body?.frontend_url || undefined,
      },
    })

    return res.json({ token })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" })
  }
}
