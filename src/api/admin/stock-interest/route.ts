import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("stock_interest")

  const { product_id, email, limit = 50, offset = 0 } = (req.query || {}) as Record<string, any>

  const filters: Record<string, any> = {}
  if (product_id) filters.product_id = product_id
  if (email) filters.email = email

  const [registrations, count] = await service.listAndCountInterestRegistrations(
    filters,
    { take: Number(limit), skip: Number(offset), order: { created_at: "DESC" } }
  )

  res.json({ registrations, count })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = (req.body || {}) as Record<string, any>
  if (!id) {
    return res.status(400).json({ message: "id is required" })
  }

  const service: any = req.scope.resolve("stock_interest")
  await service.deleteInterestRegistrations(id)

  res.status(200).json({ message: "Registration deleted" })
}
