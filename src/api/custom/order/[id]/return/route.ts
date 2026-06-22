import jwt from "jsonwebtoken"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import crypto from "crypto";

export const AUTHENTICATE = false;

const RETURN_WINDOW_DAYS = 30;

async function getCustomerId(req: MedusaRequest): Promise<string | null> {
  try {
    const authModule = req.scope.resolve(Modules.AUTH)
    const configModule = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as any
    const jwtSecret = configModule?.projectConfig?.http?.jwtSecret
    if (!jwtSecret) return null
    const authHeader = req.headers.authorization as string | undefined
    if (!authHeader) return null
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) return null
    const decoded = jwt.verify(token, jwtSecret) as any
    const auth_user_id = decoded?.auth_user_id
    if (!auth_user_id) return null
    const authIdentity = await authModule.retrieveAuthIdentity(auth_user_id)
    const appMetadata = authIdentity?.app_metadata || {}
    return (appMetadata as any).customer_id || null
  } catch {
    return null
  }
}

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

    if (deliveryMetadata) {
      const deliveredAt = new Date(deliveryMetadata);
      const deadline = new Date(deliveredAt.getTime());
      deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);
      if (new Date() > deadline) {
        return res.status(400).json({ error: "Return window has expired (30 days from delivery)" });
      }
    }

    let authorized = false;
    if (tokenParam && metadata.access_token && tokenParam === metadata.access_token) {
      authorized = true;
    }
    if (!authorized) {
      const customerId = await getCustomerId(req)
      if (customerId && order.customer_id === customerId) {
        authorized = true
      }
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
