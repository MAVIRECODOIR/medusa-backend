import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const ADMIN_SECRET = process.env.ADMIN_API_SECRET || "";

function checkAuth(req: MedusaRequest): boolean {
  const { auth_user_id } = (req as any).auth_context || {};
  if (auth_user_id) return true;

  const h = (req as any).headers;
  const secret = h?.["x-admin-secret"] || "";
  return !!(ADMIN_SECRET && secret === ADMIN_SECRET);
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "customer_id",
        "fulfillment_status",
        "payment_status",
        "total",
        "currency_code",
        "created_at",
        "metadata",
        "*items",
        "*items.variant",
        "*items.variant.product",
      ],
    });

    const pendingReturns = orders
      .map((order: any) => {
        const metadata = (order.metadata || {}) as Record<string, any>;
        const requests = (metadata.return_requests || []) as any[];
        if (!requests.length) return null;

        const activeRequests = requests.filter(
          (r: any) => r.status === "pending" || r.status === "approved"
        );
        if (!activeRequests.length) return null;

        return {
          order_id: order.id,
          display_id: order.display_id,
          email: order.email,
          total: order.total,
          currency_code: order.currency_code,
          fulfillment_status: order.fulfillment_status,
          payment_status: order.payment_status,
          created_at: order.created_at,
          delivered_at: metadata.delivered_at || null,
          items: (order.items || []).slice(0, 3).map((item: any) => ({
            id: item.id,
            title: item.variant?.product?.title || item.title,
            thumbnail: item.thumbnail,
            quantity: item.quantity,
          })),
          requests: activeRequests,
        };
      })
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          new Date(b.requests[0].created_at).getTime() -
          new Date(a.requests[0].created_at).getTime()
      );

    return res.json({ returns: pendingReturns });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
