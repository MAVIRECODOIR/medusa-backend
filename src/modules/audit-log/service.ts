import { MedusaService } from "@medusajs/framework/utils";
import { AuditLog } from "./models/audit-log";

class AuditLogService extends MedusaService({
  AuditLog,
}) {}

export default AuditLogService;
