import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import { updateCartWorkflowId } from "@medusajs/core-flows"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.validatedBody as Record<string, any>
  const input: Record<string, any> = {
    ...body,
    id: req.params.id,
  }

  if (input.shipping_address?.country_code) {
    input.shipping_address.country_code = input.shipping_address.country_code.toLowerCase()
  }
  if (input.billing_address?.country_code) {
    input.billing_address.country_code = input.billing_address.country_code.toLowerCase()
  }

  const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  await workflowEngine.run(updateCartWorkflowId, {
    input: {
      ...input,
      additional_data: body.additional_data,
    },
  })

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id: req.params.id } },
    fields: req.queryConfig.fields,
  })
  const [cart] = await remoteQuery(queryObject)
  res.status(200).json({ cart })
}
