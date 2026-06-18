import { model } from "@medusajs/framework/utils"

const InterestRegistration = model.define("interest_registration", {
  id: model.id({ prefix: "intreg" }).primaryKey(),
  email: model.text(),
  product_id: model.text(),
  variant_id: model.text().nullable(),
  notified_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})

export default InterestRegistration
