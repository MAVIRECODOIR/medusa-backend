import { MedusaService } from "@medusajs/framework/utils"
import InterestRegistration from "./models/interest-registration"

class StockInterestService extends MedusaService({
  InterestRegistration,
}) {}

export default StockInterestService
