import { MedusaService } from "@medusajs/framework/utils";
import PreOrder from "./models/pre-order";

class PreOrderService extends MedusaService({
  PreOrder,
}) {}

export default PreOrderService;
