import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const BREVO_BASE = "https://api.brevo.com/v3";
let ecommerceUnavailable = false;

async function brevoPost(path: string, body: any): Promise<boolean> {
  if (ecommerceUnavailable) return false;
  const apiKey = process.env.BREVO_API_KEY!;
  const res = await fetch(`${BREVO_BASE}${path}`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    ecommerceUnavailable = true;
    return false;
  }
  return res.ok;
}

export default async function syncCatalogHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) return;

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const data = event.data as any;

  try {
    if (event.name?.startsWith("product.")) {
      if (event.name === "product.deleted") {
        await brevoPost("/products", {
          id: data.id, name: "Deleted Product", isDeleted: true, updateEnabled: true,
        });
        return;
      }

      const { data: products } = await query.graph({
        entity: "product",
        fields: [
          "id", "title", "subtitle", "description", "handle", "thumbnail",
          "variants.id", "variants.sku", "variants.amount", "variants.calculated_price",
          "variants.currency_code", "variants.inventory_quantity",
          "images.id", "images.url",
          "collection.id", "collection.title",
        ],
        filters: { id: data.id },
      });
      if (!products?.length) return;

      const p = products[0];
      const thumb = p.thumbnail || p.images?.[0]?.url || "";
      const v = p.variants?.[0];
      const categories = p.collection ? [p.collection.id] : [];

      const vAny = v as any;
      const ok = await brevoPost("/products", {
        id: p.id, name: p.title,
        description: p.description?.substring(0, 2500) || "",
        sku: vAny?.sku || p.id,
        price: vAny?.calculated_price || vAny?.amount || 0,
        url: `${process.env.STORE_URL || "https://www.mavirecodoir.com"}/products/${p.handle}`,
        imageUrl: thumb, categories,
        stock: vAny?.inventory_quantity ?? 0,
        brand: "MAVIRE CODOIR",
        updateEnabled: true,
      });
      if (ok) logger.info(`Brevo: synced product "${p.title}"`);
    }

    if (event.name?.startsWith("product_collection.")) {
      const { data: collections } = await query.graph({
        entity: "product_collection",
        fields: ["id", "title", "handle"],
        filters: { id: data.id },
      });
      if (!collections?.length) return;

      const ok = await brevoPost("/categories", {
        id: collections[0].id, name: collections[0].title,
        url: `${process.env.STORE_URL || "https://www.mavirecodoir.com"}/collections/${collections[0].handle}`,
        updateEnabled: true,
      });
      if (ok) logger.info(`Brevo: synced collection "${collections[0].title}"`);
    }
  } catch (err: any) {
    if (!ecommerceUnavailable) logger.error(`Brevo catalog sync failed: ${err.message}`);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created", "product.updated", "product.deleted",
    "product_collection.created", "product_collection.updated", "product_collection.deleted",
  ],
};
