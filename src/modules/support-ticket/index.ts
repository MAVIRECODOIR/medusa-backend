import { Module } from "@medusajs/framework/utils";
import SupportTicketService from "./service";

export default Module("support_ticket", {
  service: SupportTicketService,
});
