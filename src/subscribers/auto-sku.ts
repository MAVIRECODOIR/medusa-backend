import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

function generateSku(productHandle: string, variantTitle: string, index: number): string {
  const prefix = productHandle
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
  const suffix = variantTitle
    ? variantTitle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
    : `V${index + 1}`;
  return `${prefix}-${suffix}`;
}

export default async function autoSkuHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  const data = event.data as any;
  if (!data?.id) return;

  try {
    const product = await productModuleService.retrieveProduct(data.id, {
      relations: ["variants"],
    });
    if (!product) return;

    let updated = false;
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i] as any;
      if (!variant.sku) {
        const sku = generateSku(product.handle, variant.title, i);
        await productModuleService.updateProductVariants(variant.id, { sku } as any);
        logger.info(`auto-sku: Assigned SKU "${sku}" to variant "${variant.title}" of "${product.handle}"`);
        updated = true;
      }
    }

    if (!updated) {
      logger.debug(`auto-sku: All variants already have SKUs for "${product.handle}"`);
    }
  } catch (e: any) {
    logger.error(`auto-sku: Failed for product ${data.id}: ${e.message}`);
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
