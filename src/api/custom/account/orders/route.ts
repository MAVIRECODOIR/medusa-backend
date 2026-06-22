import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export const AUTHENTICATE = false;

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "status",
  "fulfillment_status",
  "payment_status",
  "total",
  "subtotal",
  "shipping_total",
  "tax_total",
  "discount_total",
  "currency_code",
  "created_at",
  "metadata",
  "*items",
  "*items.variant",
  "*items.variant.product",
];

async function getCustomerId(req: MedusaRequest): Promise<string | null> {
  try {
    const authModule = req.scope.resolve(Modules.AUTH);
    const { auth_user_id } = (req as any).auth_context || {};
    if (!auth_user_id) return null;

    const authIdentity = await authModule.retrieveAuthIdentity(auth_user_id);
    const appMetadata = authIdentity?.app_metadata || {};
    return (appMetadata as any).customer_id || null;
  } catch {
    return null;
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const customerId = await getCustomerId(req);
    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const customer = await customerModuleService.retrieveCustomer(customerId);
    const customerEmail = customer.email;

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const { data: ownedOrders } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      filters: { customer_id: customerId },
    });

    const { data: allOrders } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
    });

    const linkedOrders = allOrders.filter((order: any) => {
      const meta = (order.metadata || {}) as Record<string, any>;
      return (
        meta.linked_customer_id === customerId &&
        order.customer_id !== customerId
      );
    });

    const emailSafeLinked = linkedOrders.filter(
      (order: any) => order.email === customerEmail
    );

    const seen = new Set<string>();
    const merged = [...ownedOrders, ...emailSafeLinked].filter((order: any) => {
      if (seen.has(order.id)) return false;
      seen.add(order.id);
      return true;
    });

    const result = merged.map((order: any) => {
      const { metadata: _, ...clean } = order;
      return clean;
    });

    result.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return res.json({ orders: result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
