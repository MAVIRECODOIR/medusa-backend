import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("support_ticket");

  const { status, priority, limit = 50, offset = 0, q } = (req.query || {}) as Record<string, any>;

  const filters: Record<string, any> = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;

  const listOptions: any = {
    take: Number(limit),
    skip: Number(offset),
    order: { created_at: "DESC" },
  };

  const [tickets, count] = await service.listAndCountSupportTickets(filters, listOptions);

  res.json({ tickets, count });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("support_ticket");
  const ticket = await service.createSupportTickets(req.body || {});
  res.status(201).json({ ticket });
}
