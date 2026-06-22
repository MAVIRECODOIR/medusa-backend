import { model } from "@medusajs/framework/utils";

const SupportTicket = model.define("support_ticket", {
  id: model.id({ prefix: "sptkt" }).primaryKey(),
  customer_name: model.text(),
  customer_email: model.text(),
  subject: model.text(),
  message: model.text(),
  priority: model.text().default("medium"),
  status: model.text().default("open"),
  assignee: model.text().nullable(),
  order_id: model.text().nullable(),
  metadata: model.json().nullable(),
});

export default SupportTicket;
