import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createPriceListsWorkflow } from "@medusajs/medusa/core-flows";

export default async function updatePricing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Checking for existing House Standard Pricing...");

  const { data: existingPriceLists } = await query.graph({
    entity: "price_list",
    fields: ["id", "title"],
  });

  if (existingPriceLists.some((pl: any) => pl.title === "House Standard Pricing")) {
    logger.info("House Standard Pricing already exists — skipping");
    return;
  }

  const priceListMap: Record<string, number> = {
    "archive-tee": 10500,
    "long-sleeve-tee": 12500,
    "overshirt": 27500,
    "wide-leg-trouser": 22500,
    "raw-selvedge-denim": 29500,
    "structured-jacket": 49500,
    "long-coat": 89500,
    "sankofa-coat": 125000,
  };

  const productHandles = Object.keys(priceListMap);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku"],
  });

  const matchedProducts = products.filter((p: any) =>
    productHandles.includes(p.handle)
  );

  if (matchedProducts.length === 0) {
    logger.info("No matching products found — nothing to update");
    return;
  }

  const prices: { variant_id: string; amount: number; currency_code: string }[] = [];

  for (const product of matchedProducts) {
    const amount = priceListMap[product.handle as string];
    for (const variant of product.variants) {
      prices.push({
        variant_id: variant.id,
        amount,
        currency_code: "gbp",
      });
    }
  }

  logger.info(`Creating House Standard Pricing with ${prices.length} price entries across ${matchedProducts.length} products`);

  await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        {
          title: "House Standard Pricing",
          description: "Standard retail pricing for all MAVIRE CODOIR products",
          type: "sale",
          status: "active",
          prices: prices as any,
        },
      ],
    } as any,
  });

  logger.info("House Standard Pricing created successfully");
}
