import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export const AUTHENTICATE = false

const ADMIN_SECRET = process.env.ADMIN_API_SECRET || "";

function checkAuth(req: MedusaRequest): boolean {
  const { auth_user_id } = (req as any).auth_context || {};
  if (auth_user_id) return true;

  const h = (req as any).headers;
  const secret = h?.["x-admin-secret"] || "";
  return !!(ADMIN_SECRET && secret === ADMIN_SECRET);
}

async function logAudit(req: MedusaRequest, action: string, entity_id: string, details: Record<string, any>) {
  try {
    const auditLog: any = req.scope.resolve("audit_log");
    await auditLog.createAuditLogs({
      action,
      entity_type: "return",
      entity_id,
      user_id: (req as any).auth_context?.auth_user_id || null,
      user_role: null,
      details,
    });
  } catch {}
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
    const reqData = requests[foundRequestIndex];
    requests[foundRequestIndex] = {
      ...reqData,
      status: action === "approved" ? "approved" : "rejected",
      handled_at: new Date().toISOString(),
    };

    await orderModuleService.updateOrders(foundOrder.id, {
      metadata: {
        ...metadata,
        return_requests: requests,
      },
    });

    logAudit(req, `return_${action}`, foundOrder.id, {
      title: action === "approved" ? "Return Approved" : "Return Rejected",
      message: `Return #${requestId.slice(0, 8)} for order #${foundOrder.display_id || foundOrder.id.slice(0, 8)} was ${action}`,
      reason: reqData.reason,
    });

    return res.json({
      return: requests[foundRequestIndex],
      order_id: foundOrder.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
