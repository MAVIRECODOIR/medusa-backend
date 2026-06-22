import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("audit_log");

  const { since } = (req.query || {}) as Record<string, any>;
  const filters: Record<string, any> = {};
  if (since) filters.created_at = { $gte: new Date(since) };

  const [_, count] = await service.listAndCountAuditLogs(filters);

  res.json({ count });
}
