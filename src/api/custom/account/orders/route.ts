import jwt from "jsonwebtoken";
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
    const configModule = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as any;
    const jwtSecret = configModule?.projectConfig?.http?.jwtSecret;
    if (!jwtSecret) return null;

    const authHeader = req.headers.authorization as string | undefined;
    if (!authHeader) return null;

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return null;

    const decoded = jwt.verify(token, jwtSecret) as any;
    if (decoded?.actor_type === "customer" && decoded?.actor_id) {
      return decoded.actor_id;
    }
    if (decoded?.auth_user_id) {
      const authModule = req.scope.resolve(Modules.AUTH);
      try {
        const authIdentity = await authModule.retrieveAuthIdentity(decoded.auth_user_id);
        const appMetadata = authIdentity?.app_metadata || {};
        return (appMetadata as any).customer_id || null;
      } catch {
        return null;
      }
    }
    return null;
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

    const { data: emailLinkedOrders } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      filters: { email: customerEmail },
    });

    const filteredLinked = emailLinkedOrders.filter(
      (order: any) => order.customer_id !== customerId
    );

    const seen = new Set<string>();
    const merged = [...ownedOrders, ...filteredLinked].filter((order: any) => {
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
