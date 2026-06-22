import { MedusaService } from "@medusajs/framework/utils";
import SupportTicket from "./models/support-ticket";

class SupportTicketService extends MedusaService({
  SupportTicket,
}) {}

export default SupportTicketService;
