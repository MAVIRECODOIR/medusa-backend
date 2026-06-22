import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("pre_order");

  const { email, status, limit = 50, offset = 0, q } = (req.query || {}) as Record<string, any>;

  const filters: Record<string, any> = {};
  if (email) filters.email = email;
  if (status) filters.status = status;

  const listOptions: any = {
    take: Number(limit),
    skip: Number(offset),
    order: { created_at: "DESC" },
  };

  const [preOrders, count] = await service.listAndCountPreOrders(filters, listOptions);

  res.json({ pre_orders: preOrders, count });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("pre_order");
  const body = req.body || {};

  const preOrder = await service.createPreOrders(body);

  res.status(201).json({ pre_order: preOrder });
}
