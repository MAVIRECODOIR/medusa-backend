import jwt from "jsonwebtoken"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

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

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string };
  const tokenParam = (req.query.token as string) || "";

  if (!id) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "email", "customer_id", "fulfillment_status", "metadata", "created_at", "display_id"],
      filters: { id },
    });

    const order = data[0];
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const metadata = (order.metadata || {}) as Record<string, any>;

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

    const deliveredAt = metadata.delivered_at
      ? new Date(metadata.delivered_at)
      : null;

    const now = new Date();

    if (!deliveredAt) {
      return res.json({
        delivered_at: null,
        deadline: null,
        days_remaining: null,
        eligible: false,
        expired: false,
        not_delivered_yet: true,
      });
    }

    const deadline = new Date(deliveredAt.getTime());
    deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);

    const diffMs = deadline.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const eligible = now <= deadline;

    return res.json({
      delivered_at: deliveredAt.toISOString(),
      deadline: deadline.toISOString(),
      days_remaining: daysRemaining,
      eligible,
      expired: now > deadline,
      not_delivered_yet: false,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
