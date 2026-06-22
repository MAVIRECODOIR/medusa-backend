import { Module } from "@medusajs/framework/utils";
import AuditLogService from "./service";

export default Module("audit_log", {
  service: AuditLogService,
});
