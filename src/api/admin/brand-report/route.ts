import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { brand, domain, sales_channel, payment_provider, order_source, limit = 50, offset = 0 } = (req.query || {}) as Record<string, any>;

  const filters: Record<string, any> = {};
  if (brand) filters.brand = brand;
  if (domain) filters.domain = domain;
  if (sales_channel) filters.sales_channel = sales_channel;
  if (payment_provider) filters.payment_provider = payment_provider;
  if (order_source) filters.order_source = order_source;

  const { data, metadata } = await query.graph({
    entity: "orders",
    fields: [
      "id",
      "display_id",
      "status",
      "total",
      "currency_code",
      "email",
      "metadata",
      "created_at",
      "sales_channel_id",
    ],
    filters: Object.keys(filters).length
      ? { metadata: filters }
      : undefined,
    pagination: {
      take: Number(limit),
      skip: Number(offset),
    },
  } as any);

  res.json({ orders: data, count: metadata?.count ?? data.length });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { ids, brand, domain, order_source } = (req.body || {}) as Record<string, any>;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "ids array is required" });
  }

  const orderModuleService = req.scope.resolve("order");
  const updated: string[] = [];

  for (const id of ids) {
    const existing = await orderModuleService.retrieveOrder(id, {
      select: ["id", "metadata"],
    });

    const metadata = {
      ...(existing.metadata || {}),
      ...(brand && { brand }),
      ...(domain && { domain }),
      ...(order_source && { order_source }),
    };

    await orderModuleService.updateOrders(id, { metadata });
    updated.push(id);
  }

  res.json({ updated });
}
