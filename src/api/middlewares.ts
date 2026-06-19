import { defineMiddlewares } from "@medusajs/medusa"
import type { Request, Response, NextFunction } from "express"

function normalizeCountryCodes(req: Request, _res: Response, next: NextFunction) {
  if (req.body?.shipping_address?.country_code) {
    req.body.shipping_address.country_code = req.body.shipping_address.country_code.toLowerCase()
  }
  if (req.body?.billing_address?.country_code) {
    req.body.billing_address.country_code = req.body.billing_address.country_code.toLowerCase()
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/carts/:id",
      method: "POST",
      middlewares: [normalizeCountryCodes],
    },
  ],
})
