import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => ({
      selector: { id: data.input.store_id },
      update: {
        supported_currencies: data.input.supported_currencies.map((c) => ({
          currency_code: c.currency_code,
          is_default: c.is_default ?? false,
        })),
      },
    }));
    return new WorkflowResponse(updateStoresWorkflow(normalizedInput as any));
  }
);

export default async function storeSetup({ container }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("Starting comprehensive store setup...");

  // 1. Get the store
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_sales_channel_id"],
  });

  if (stores.length === 0) {
    logger.error("No store found!");
    return;
  }

  const store = stores[0];
  logger.info(`Found store: ${store.name} (${store.id})`);

  // 2. Set supported currencies with GBP as default
  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        { currency_code: "gbp", is_default: true },
        { currency_code: "usd" },
        { currency_code: "eur" },
        { currency_code: "jpy" },
        { currency_code: "cad" },
        { currency_code: "aud" },
        { currency_code: "chf" },
      ],
    },
  });
  logger.info("Default currency set to GBP, all currencies configured");

  // 3. Update store name
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { name: "MAVIRE" },
    },
  });
  logger.info("Store name updated to MAVIRE");

  // 4. Create UK Region with GBP
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries"],
  });

  let ukRegion = regions.find((r) => r.currency_code === "gbp");
  if (!ukRegion) {
    await query.graph({
      entity: "region",
      data: {
        name: "United Kingdom",
        currency_code: "gbp",
        countries: ["gb"],
        automatic_taxes: true,
      },
    });
    logger.info("Created UK region with GBP");
  } else {
    logger.info("UK region already exists");
  }

  // 5. Set UK as default region on store
  const { data: updatedRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    filters: { currency_code: "gbp" },
  });

  if (updatedRegions.length > 0) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { default_region_id: updatedRegions[0].id },
      },
    });
    logger.info("UK region set as default on store");
  }

  // 6. Create sales channel if needed
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });

  let defaultChannel = salesChannels[0];
  if (!defaultChannel) {
    const { result } = await (
      await import("@medusajs/medusa/core-flows")
    ).createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          { name: "Default Store", description: "Main sales channel" } as any,
        ],
      },
    });
    defaultChannel = result[0];
    logger.info("Created default sales channel");
  }

  // Set default sales channel on store
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_sales_channel_id: defaultChannel.id },
    },
  });
  logger.info("Store linked to default sales channel");

  logger.info("Store setup completed successfully!");
  logger.info("Default currency: GBP");
  logger.info("Available currencies: GBP, USD, EUR, JPY, CAD, AUD, CHF");
  logger.info("Default region: United Kingdom (GBP)");
}
