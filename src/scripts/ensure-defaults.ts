import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function ensureDefaults({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const storeModuleService = container.resolve(Modules.STORE);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  try {
    const [store] = await storeModuleService.listStores();
    if (!store) {
      logger.error("ensure-defaults: No store found");
      return;
    }

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { name: "MAVIRE CODOIR" },
      },
    });

    let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
      name: "Default Store",
    });

    if (!defaultSalesChannel.length) {
      const { result } = await createSalesChannelsWorkflow(container).run({
        input: {
          salesChannelsData: [{
            name: "Default Store",
            description: "Main sales channel for MAVIRE CODOIR - Global shipping",
          }],
        },
      });
      defaultSalesChannel = result;
      logger.info("ensure-defaults: Created sales channel: Default Store");
    }

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { default_sales_channel_id: defaultSalesChannel[0].id },
      },
    });

    async function getLocations() {
      const { data } = await query.graph({
        entity: "stock_location",
        fields: ["id", "name"],
      });
      return data as any[];
    }

    let locs = await getLocations();
    let londonLocation = locs.find((l: any) => l.name.includes("London"));
    if (!londonLocation) {
      const { result } = await createStockLocationsWorkflow(container).run({
        input: {
          locations: [{
            name: "Main Warehouse - London",
            address: {
              address_1: "1 London Bridge",
              city: "London",
              country_code: "GB",
              postal_code: "EC1A 1BB",
            },
          }],
        },
      });
      londonLocation = result[0] as any;
      logger.info("ensure-defaults: Created stock location: Main Warehouse - London");
    }

    // Ensure EUR warehouse exists
    locs = await getLocations();
    let eurLocation = locs.find(
      (l: any) => l.name.includes("EUR") || l.name.includes("European") || l.name.includes("Amsterdam")
    );
    if (!eurLocation) {
      const { result } = await createStockLocationsWorkflow(container).run({
        input: {
          locations: [{
            name: "European Warehouse - Amsterdam",
            address: {
              address_1: "Damrak 1",
              city: "Amsterdam",
              country_code: "NL",
              postal_code: "1012 LG",
            },
          }],
        },
      });
      eurLocation = result[0] as any;
      logger.info("ensure-defaults: Created stock location: European Warehouse - Amsterdam");
    }

    // Link EUR to sales channel
    try {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: eurLocation!.id, add: [defaultSalesChannel[0].id] },
      });
    } catch (_) {}

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { default_location_id: londonLocation!.id },
      },
    });

    try {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: londonLocation!.id, add: [defaultSalesChannel[0].id] },
      });
    } catch (_) {}

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            { currency_code: "gbp", is_default: true },
            { currency_code: "usd" },
            { currency_code: "eur" },
          ],
        },
      },
    });

    logger.info("ensure-defaults: All defaults verified");
  } catch (e: any) {
    logger.error(`ensure-defaults: ${e.message}`);
  }
}
