import { model } from "@medusajs/framework/utils";

export const AuditLog = model.define("audit_log", {
  id: model.id().primaryKey(),
  action: model.text(),
  entity_type: model.text(),
  entity_id: model.text().nullable(),
  user_id: model.text().nullable(),
  user_role: model.text().nullable(),
  details: model.json().nullable(),
});
