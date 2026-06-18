import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

type StatusConfig = {
  status: string;
  estimatedArrival?: string;
};

const PRODUCT_STATUSES: Record<string, StatusConfig> = {
  "archive-tee": { status: "in_stock" },
  "long-sleeve-tee": { status: "in_stock" },
  "overshirt": { status: "in_stock" },
  "wide-leg-trouser": { status: "in_stock" },
  "raw-selvedge-denim": { status: "pre_order", estimatedArrival: "September 2026" },
  "structured-jacket": { status: "pre_order", estimatedArrival: "October 2026" },
  "long-coat": { status: "future_run" },
  "sankofa-coat": { status: "pre_order", estimatedArrival: "December 2026" },
};

const COMING_SOON: string[] = ["long-coat"];

const VARIANT_SOLD_OUT: Record<string, string[]> = {
  "overshirt": ["S"],
  "raw-selvedge-denim": ["S"],
};

export default async function seedProductionStatus({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "title",
      "metadata",
      "variants.id",
      "variants.title",
      "variants.metadata",
    ],
  });

  for (const product of products) {
    const config = PRODUCT_STATUSES[product.handle];
    if (!config) {
      logger.info(`  Skipping ${product.handle} — no status mapping`);
      continue;
    }

    const currentProductMetadata = product.metadata || {};
    const shouldSetComingSoon = COMING_SOON.includes(product.handle);
    const needsStatusUpdate = currentProductMetadata.production_status !== config.status
      || (config.estimatedArrival && currentProductMetadata.estimated_arrival !== config.estimatedArrival);
    const needsComingSoonUpdate = shouldSetComingSoon !== (currentProductMetadata.coming_soon === true);

    if (needsStatusUpdate || needsComingSoonUpdate) {
      const productUpdate: Record<string, any> = {
        metadata: { ...currentProductMetadata },
      };
      productUpdate.metadata.production_status = config.status;
      if (config.estimatedArrival) {
        productUpdate.metadata.estimated_arrival = config.estimatedArrival;
      }
      productUpdate.metadata.coming_soon = shouldSetComingSoon || undefined;
      await productModule.updateProducts(product.id, productUpdate);
      logger.info(`  ${product.handle} → ${config.status}${config.estimatedArrival ? ` (ships ${config.estimatedArrival})` : ""}${shouldSetComingSoon ? ", coming_soon: true" : ""}`);
    } else {
      logger.info(`  ${product.handle} — already ${config.status}, skipped`);
    }

    const soldOutSizes = VARIANT_SOLD_OUT[product.handle] || [];
    for (const variant of product.variants) {
      const shouldBeSoldOut = soldOutSizes.includes(variant.title);
      const currentVariantMetadata = variant.metadata || {};
      if (shouldBeSoldOut && currentVariantMetadata.production_status !== "sold_out") {
        await productModule.updateProductVariants(variant.id, {
          metadata: {
            ...currentVariantMetadata,
            production_status: "sold_out",
          },
        });
        logger.info(`    ${variant.title} → sold_out`);
      } else if (!shouldBeSoldOut && currentVariantMetadata.production_status === "sold_out") {
        await productModule.updateProductVariants(variant.id, {
          metadata: {
            ...currentVariantMetadata,
            production_status: undefined,
          },
        });
        logger.info(`    ${variant.title} → cleared (inherits product status)`);
      } else {
        logger.info(`    ${variant.title} — already ok, skipped`);
      }
    }
  }

  logger.info("Done — production status seeded");
}
