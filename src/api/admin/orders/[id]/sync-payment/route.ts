import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import { capturePaymentWorkflow } from "@medusajs/core-flows"
import Stripe from "stripe"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const authContext = (req as any).auth_context

  const stripeApiKey = process.env.STRIPE_API_KEY
  if (!stripeApiKey) {
    return res.status(500).json({ error: "STRIPE_API_KEY not configured" })
  }

  const stripe = new Stripe(stripeApiKey, {
    apiVersion: "2026-05-27.dahlia",
  })
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const query = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { filters: { id } },
    fields: [
      "id",
      "payment_status",
      "payments.id",
      "payments.provider_id",
      "payments.data",
      "payments.amount",
      "payments.captured_at",
      "payments.payment_collection_id",
    ],
  })

  const [order] = await remoteQuery(query)
  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }

  const results: any[] = []

  for (const payment of order.payments || []) {
    const providerId: string = payment.provider_id || ""
    const paymentData: any = payment.data || {}
    const paymentIntentId: string | undefined = paymentData.id

    if (providerId.includes("stripe") && paymentIntentId) {
      try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId)

        if (intent.status === "succeeded" && !payment.captured_at) {
          await capturePaymentWorkflow(req.scope).run({
            input: {
              payment_id: payment.id,
              captured_by: authContext?.actor_id || "admin",
            },
          })

          results.push({
            payment_id: payment.id,
            provider: providerId,
            status: "synced",
            stripe_status: intent.status,
          })
        } else {
          results.push({
            payment_id: payment.id,
            provider: providerId,
            status: intent.status === "succeeded" ? "already_captured" : "not_captured_on_provider",
            stripe_status: intent.status,
          })
        }
      } catch (err: any) {
        results.push({
          payment_id: payment.id,
          provider: providerId,
          status: "error",
          error: err.message,
        })
      }
    } else if (providerId.includes("paypal")) {
      results.push({
        payment_id: payment.id,
        provider: providerId,
        status: "unsupported",
        message: "PayPal sync not yet supported",
      })
    } else if (paymentIntentId) {
      results.push({
        payment_id: payment.id,
        provider: providerId,
        status: "unknown_provider",
      })
    }
  }

  if (results.length === 0) {
    return res.json({ order_id: id, message: "No payments found on this order", results })
  }

  res.json({ order_id: id, results })
}
