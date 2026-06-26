import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ShippoFulfillmentService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShippoFulfillmentService],
})
