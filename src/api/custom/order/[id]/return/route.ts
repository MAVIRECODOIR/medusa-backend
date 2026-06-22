import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import crypto from "crypto";

export const AUTHENTICATE = false;

const RETURN_WINDOW_DAYS = 30;

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string };
  const tokenParam = (req.query.token as string) || "";
  const { reason, note } = req.body as { reason?: string; note?: string };

  if (!id) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  if (!reason?.trim()) {
    return res.status(400).json({ error: "Reason is required" });
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const orderModuleService = req.scope.resolve(Modules.ORDER);

    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "email", "customer_id", "fulfillment_status", "metadata", "display_id"],
      filters: { id },
    });

    const order = data[0];
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const metadata = (order.metadata || {}) as Record<string, any>;
    const deliveryMetadata = metadata.delivered_at as string | undefined;

    // Check return window if delivered
    if (deliveryMetadata) {
      const deliveredAt = new Date(deliveryMetadata);
      const deadline = new Date(deliveredAt.getTime());
      deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);
      if (new Date() > deadline) {
        return res.status(400).json({ error: "Return window has expired (30 days from delivery)" });
      }
    }

    // Auth check
    let authorized = false;
    if (tokenParam && metadata.access_token && tokenParam === metadata.access_token) {
      authorized = true;
    }
    if (!authorized) {
      try {
        const authModule = req.scope.resolve(Modules.AUTH);
        const { auth_user_id } = (req as any).auth_context || {};
        if (auth_user_id) {
          const authIdentity = await authModule.retrieveAuthIdentity(auth_user_id);
          const appMetadata = authIdentity?.app_metadata || {};
          const customerId = (appMetadata as any).customer_id || null;
          if (customerId && order.customer_id === customerId) {
            authorized = true;
          }
        }
      } catch {}
    }

    if (!authorized) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Build the return request entry
    const returnRequest = {
      id: crypto.randomUUID(),
      reason,
      note: note || "",
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const existingRequests = (metadata.return_requests || []) as any[];
    await orderModuleService.updateOrders(order.id, {
      metadata: {
        ...metadata,
        return_requests: [...existingRequests, returnRequest],
      },
    });

    return res.json({ return: returnRequest });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
