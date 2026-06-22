import { MedusaResponse, MedusaStoreRequest, refetchEntity } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MedusaWorkflow } from "@medusajs/framework/workflows-sdk"

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

  if (!provider_id || typeof provider_id !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "provider_id is required to create a payment session"
    )
  }

  try {
    const workflow = MedusaWorkflow.getWorkflow("create-payment-sessions")
    if (!workflow) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Core workflow "create-payment-sessions" is not registered`
      )
    }
    await workflow(req.scope).run({
      input: {
        payment_collection_id: collectionId,
        provider_id,
        customer_id: req.auth_context?.actor_id,
        data,
      },
    })
  } catch (error) {
    const message =
      typeof error === "object" && error !== null
        ? (error as Record<string, unknown>).message || JSON.stringify(error)
        : String(error)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to create payment session for provider '${provider_id}': ${message}`
    )
  }

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
