import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("stock_interest")

  const registrations = await service.listInterestRegistrations({})

  const byProduct: Record<string, { count: number; variants: Record<string, number> }> = {}

  for (const r of registrations) {
    if (!byProduct[r.product_id]) {
      byProduct[r.product_id] = { count: 0, variants: {} }
    }
    byProduct[r.product_id].count++

    if (r.variant_id) {
      if (!byProduct[r.product_id].variants[r.variant_id]) {
        byProduct[r.product_id].variants[r.variant_id] = 0
      }
      byProduct[r.product_id].variants[r.variant_id]++
    }
  }

  res.json({ total: registrations.length, byProduct })
}
