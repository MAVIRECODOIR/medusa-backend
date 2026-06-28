import { MedusaRequest, MedusaResponse, defineMiddlewares } from "@medusajs/framework/http"

const normalizeCountryCode = (req: MedusaRequest, _res: MedusaResponse, next: () => void) => {
  const body = (req as any).validatedBody as Record<string, any> | undefined
  if (body?.shipping_address?.country_code) {
    body.shipping_address.country_code = body.shipping_address.country_code.toLowerCase()
  }
  if (body?.billing_address?.country_code) {
    body.billing_address.country_code = body.billing_address.country_code.toLowerCase()
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/carts/:id",
      method: "POST",
      middlewares: [normalizeCountryCode],
    },
    {
      matcher: "/hooks/payment/stripe",
      method: "POST",
      bodyParser: {
        preserveRawBody: true,
      },
    },
  ],
})
