import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { syncProductToVeeqoWorkflow } from "medusa-plugin-veeqo/workflows/product";
import { syncChannelToVeeqoWorkflow } from "medusa-plugin-veeqo/workflows/channel";
import { syncCustomerToVeeqoWorkflow } from "medusa-plugin-veeqo/workflows/customer";
import { syncDeliveryMethodToVeeqoWorkflow } from "medusa-plugin-veeqo/workflows/delivery-method";
import { syncWarehouseToVeeqoWorkflow } from "medusa-plugin-veeqo/workflows/warehouse";

export default async function syncVeeqo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // Step 1: Sync warehouses (stock locations)
  logger.info("Syncing warehouses to Veeqo...");
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  for (const loc of stockLocations) {
    try {
      await syncWarehouseToVeeqoWorkflow(container).run({ input: loc.id });
      logger.info(`  Synced warehouse: ${loc.name}`);
    } catch (e: any) {
      logger.error(`  Failed warehouse ${loc.name}: ${e.message}`);
    }
  }

  // Step 2: Sync shipping options (delivery methods)
  logger.info("Syncing shipping options to Veeqo...");
  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  });
  for (const opt of shippingOptions) {
    try {
      await syncDeliveryMethodToVeeqoWorkflow(container).run({ input: opt.id });
      logger.info(`  Synced shipping option: ${opt.name}`);
    } catch (e: any) {
      logger.error(`  Failed shipping option ${opt.name}: ${e.message}`);
    }
  }

  // Step 3: Sync sales channels
  logger.info("Syncing sales channels to Veeqo...");
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  for (const channel of salesChannels) {
    try {
      await syncChannelToVeeqoWorkflow(container).run({ input: channel.id });
      logger.info(`  Synced sales channel: ${channel.name}`);
    } catch (e: any) {
      logger.error(`  Failed sales channel ${channel.name}: ${e.message}`);
    }
  }

  // Step 4: Sync products
  logger.info("Syncing products to Veeqo...");
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
  });
  for (const product of products) {
    try {
      await syncProductToVeeqoWorkflow(container).run({ input: product.id });
      logger.info(`  Synced product: ${product.title} (${product.handle})`);
    } catch (e: any) {
      logger.error(`  Failed product ${product.title}: ${e.message}`);
    }
  }

  logger.info("Veeqo sync complete!");
}
