import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export const AUTHENTICATE = false;

const RETURN_WINDOW_DAYS = 30;

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

    // Same auth check as the main order endpoint
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
