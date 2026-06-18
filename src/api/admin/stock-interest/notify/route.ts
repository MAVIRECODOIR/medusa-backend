import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = (req.body || {}) as Record<string, any>

  if (!product_id) {
    return res.status(400).json({ message: "product_id is required" })
  }

  const service: any = req.scope.resolve("stock_interest")

  const registrations = await service.listInterestRegistrations({
    product_id,
    notified_at: null,
  })

  if (registrations.length === 0) {
    return res.json({ message: "No pending registrations for this product", notified: 0 })
  }

  const ids = registrations.map((r: any) => r.id)

  for (const id of ids) {
    await service.updateInterestRegistrations({
      id,
      notified_at: new Date(),
    })
  }

  res.json({
    message: `Marked ${ids.length} registrations as notified`,
    notified: ids.length,
    emails: registrations.map((r: any) => r.email),
  })
}
