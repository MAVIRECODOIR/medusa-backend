import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

const ADMIN_SECRET = process.env.ADMIN_API_SECRET || "";

function checkAuth(req: MedusaRequest): boolean {
  const { auth_user_id } = (req as any).auth_context || {};
  if (auth_user_id) return true;

  const h = (req as any).headers;
  const secret = h?.["x-admin-secret"] || "";
  return !!(ADMIN_SECRET && secret === ADMIN_SECRET);
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { requestId } = req.params as { requestId: string };
  const { action } = req.body as { action: "approved" | "rejected" };
  const { order_id } = req.query as { order_id?: string };

  if (!requestId || !action) {
    return res.status(400).json({ error: "requestId and action are required" });
  }

  if (!["approved", "rejected"].includes(action)) {
    return res.status(400).json({ error: "action must be 'approved' or 'rejected'" });
  }

  try {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const orderModuleService = req.scope.resolve(Modules.ORDER);

    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "metadata"],
      filters: order_id ? { id: order_id } : {},
    });

    let foundOrder: any = null;
    let foundRequestIndex = -1;

    for (const order of orders) {
      const metadata = (order.metadata || {}) as Record<string, any>;
      const requests = (metadata.return_requests || []) as any[];
      const idx = requests.findIndex((r: any) => r.id === requestId);
      if (idx !== -1) {
        foundOrder = order;
        foundRequestIndex = idx;
        break;
      }
    }

    if (!foundOrder || foundRequestIndex === -1) {
      return res.status(404).json({ error: "Return request not found" });
    }

    const metadata = (foundOrder.metadata || {}) as Record<string, any>;
    const requests = [...((metadata.return_requests || []) as any[])];
    requests[foundRequestIndex] = {
      ...requests[foundRequestIndex],
      status: action === "approved" ? "approved" : "rejected",
      handled_at: new Date().toISOString(),
    };

    await orderModuleService.updateOrders(foundOrder.id, {
      metadata: {
        ...metadata,
        return_requests: requests,
      },
    });

    return res.json({
      return: requests[foundRequestIndex],
      order_id: foundOrder.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
