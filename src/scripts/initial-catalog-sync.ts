import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const BREVO_BASE = "https://api.brevo.com/v3";

async function brevoGet(path: string): Promise<any> {
  const res = await fetch(`${BREVO_BASE}${path}`, {
    headers: { "api-key": process.env.BREVO_API_KEY! },
  });
  if (!res.ok) throw new Error(`Brevo API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function brevoPost(path: string, body: any): Promise<void> {
  const res = await fetch(`${BREVO_BASE}${path}`, {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Brevo API ${res.status}: ${await res.text()}`);
}

async function checkEcommerceAvailable(logger: any): Promise<boolean> {
  try {
    await brevoGet("/account");
    // Try a lightweight category POST – if it fails with 403, ecommerce isn't available
    const res = await fetch(`${BREVO_BASE}/categories`, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: "ecommerce-check", name: "_ecommerce_check", updateEnabled: true }),
    });
    if (res.status === 403) {
      logger.info("∼ Brevo ecommerce catalog not available (free plan) – skipping sync");
      return false;
    }
    // Cleanup
    await fetch(`${BREVO_BASE}/categories/ecommerce-check`, {
      method: "DELETE",
      headers: { "api-key": process.env.BREVO_API_KEY! },
    }).catch(() => {});
    return true;
  } catch {
    logger.info("∼ Brevo ecommerce catalog not available – skipping sync");
    return false;
  }
}

export default async function initialCatalogSync({ container }: { container: any }) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) throw new Error("BREVO_API_KEY not set");

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  if (!(await checkEcommerceAvailable(logger))) {
    logger.info("  Campaigns still work via: npx medusa exec src/scripts/build-campaign.ts --handle <handle>");
    logger.info("  Upgrade Brevo to Business plan for catalog sync → product blocks in drag-drop campaigns");
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // ── Sync collections → Brevo categories ──
  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title", "handle"],
  });
  logger.info(`Syncing ${collections.length} collections...`);
  for (const col of collections) {
    await brevoPost("/categories", {
      id: col.id,
      name: col.title,
      url: `${process.env.STORE_URL || "https://www.mavirecodoir.com"}/collections/${col.handle}`,
      updateEnabled: true,
    });
    logger.info(`  ✓ "${col.title}"`);
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Sync products ──
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "subtitle", "description", "handle", "thumbnail",
      "variants.id", "variants.sku", "variants.amount", "variants.calculated_price",
      "variants.currency_code", "variants.inventory_quantity",
      "images.id", "images.url",
      "collection.id", "collection.title",
    ],
  });
  logger.info(`Syncing ${products.length} products...`);
  for (const product of products) {
    const thumbnail = product.thumbnail || product.images?.[0]?.url || "";
    const firstVariant = product.variants?.[0];
    const categories = product.collection ? [product.collection.id] : [];

    await brevoPost("/products", {
      id: product.id,
      name: product.title,
      description: product.description?.substring(0, 2500) || "",
      sku: firstVariant?.sku || product.id,
      price: firstVariant?.calculated_price || firstVariant?.amount || 0,
      url: `${process.env.STORE_URL || "https://www.mavirecodoir.com"}/products/${product.handle}`,
      imageUrl: thumbnail,
      categories,
      stock: firstVariant?.inventory_quantity ?? 0,
      brand: "MAVIRE CODOIR",
      updateEnabled: true,
    });
    logger.info(`  ✓ "${product.title}"`);
    await new Promise((r) => setTimeout(r, 300));
  }

  logger.info(`✓ Done: ${collections.length} collections, ${products.length} products synced to Brevo`);
}
