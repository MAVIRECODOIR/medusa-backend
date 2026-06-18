import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const AUTHENTICATE = false

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, product_id, variant_id } = (req.body || {}) as Record<string, any>

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

  res.status(201).json({ registration })
}
