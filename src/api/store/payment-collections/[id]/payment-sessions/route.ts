import { MedusaResponse, MedusaStoreRequest, refetchEntity } from "@medusajs/framework/http"
import { createPaymentSessionsWorkflow } from "@medusajs/core-flows"

type CreatePaymentSessionBody = {
  provider_id: string
  data?: Record<string, unknown>
}

const defaultPaymentCollectionFields = [
  "id",
  "currency_code",
  "amount",
  "*payment_sessions",
]

export async function POST(req: MedusaStoreRequest, res: MedusaResponse) {
  const collectionId = req.params.id
  const { provider_id, data } = req.body as CreatePaymentSessionBody

  await createPaymentSessionsWorkflow(req.scope).run({
    input: {
      payment_collection_id: collectionId,
      provider_id,
      customer_id: req.auth_context?.actor_id,
      data,
    },
  })

  const paymentCollection = await refetchEntity({
    entity: "payment_collection",
    idOrFilter: collectionId,
    scope: req.scope,
    fields: req.queryConfig?.fields ?? defaultPaymentCollectionFields,
  })

  res.status(200).json({
    payment_collection: paymentCollection,
  })
}
