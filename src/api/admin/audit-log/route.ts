import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("audit_log");

  const { limit = 50, offset = 0, entity_type, action, user_id, user_role } = (req.query || {}) as Record<string, any>;

  const filters: Record<string, any> = {};
  if (entity_type) filters.entity_type = entity_type;
  if (action) filters.action = action;
  if (user_id) filters.user_id = user_id;
  if (user_role) filters.user_role = user_role;

  const [logs, count] = await service.listAndCountAuditLogs(
    filters,
    { skip: Number(offset), take: Number(limit), order: { created_at: "DESC" } }
  );

  res.json({ logs, count });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("audit_log");
  const { action, entity_type, entity_id, user_id, user_role, details } = (req.body || {}) as Record<string, any>;

  if (!action || !entity_type) {
    return res.status(400).json({ message: "action and entity_type are required" });
  }

  const log = await service.createAuditLogs({
    action,
    entity_type,
    entity_id: entity_id || null,
    user_id: user_id || null,
    user_role: user_role || null,
    details: details || null,
  });

  res.status(201).json({ log });
}
