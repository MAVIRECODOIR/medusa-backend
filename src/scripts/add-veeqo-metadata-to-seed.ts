import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function addVeeqoMetadataToSeed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  logger.info("Adding Veeqo delivery method IDs to shipping options...");

  // Define Veeqo delivery method IDs for each shipping option
  const veeqoDeliveryMethodIds: Record<string, number> = {
    "Complimentary Standard Delivery": 2026270,
    "Express Delivery": 2026269,
    "International Delivery": 2026273,
    "International Standard Delivery": 2026272,
  };

  // Get all shipping options
  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "metadata"],
  });

  for (const option of shippingOptions) {
    const metadata = (option.metadata || {}) as Record<string, any>;
    const veeqoId = veeqoDeliveryMethodIds[option.name];

    if (!veeqoId) {
      logger.info(`⏭️ No Veeqo ID configured for: ${option.name}`);
      continue;
    }

    if (metadata.veeqo_delivery_method_id) {
      logger.info(`⏭️ Already has Veeqo ID: ${option.name} (${metadata.veeqo_delivery_method_id})`);
      continue;
    }

    // Update the shipping option with Veeqo metadata
    await fulfillmentModuleService.updateShippingOptions({
      selector: { id: option.id },
      data: {
        metadata: {
          ...metadata,
          veeqo_delivery_method_id: veeqoId,
        },
      },
    } as any);

    logger.info(`✅ Added Veeqo ID to: ${option.name} (${veeqoId})`);
  }

  logger.info("Finished adding Veeqo delivery method IDs to shipping options.");
}
