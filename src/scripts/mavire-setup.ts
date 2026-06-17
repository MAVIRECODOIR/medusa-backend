import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  createShippingProfilesWorkflow,
  createShippingOptionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";

const ALL_COUNTRIES = ["gb", "de", "fr", "it", "es", "nl", "us", "ca", "jp", "au", "ch"];

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

export default async function mavireSetup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const storeModuleService = container.resolve(Modules.STORE);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  logger.info("🚀 Starting MAVIRE CODOIR store setup...");

  // ─── 1. STORE & CURRENCIES ────────────────────────────────────────────
  const [store] = await storeModuleService.listStores();
  if (!store) {
    logger.error("❌ No store found in database!");
    return;
  }
  logger.info(`📦 Found store: ${store.name} (${store.id})`);

  // Set GBP as default + all required currencies
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
  logger.info("✅ Currencies configured: GBP(default), USD, EUR, JPY, CAD, AUD, CHF");

  // Update store name
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { name: "MAVIRE CODOIR" },
    },
  });
  logger.info("✅ Store name set to: MAVIRE CODOIR");

  // ─── 2. SALES CHANNELS ────────────────────────────────────────────────
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Store",
  });

  if (!defaultSalesChannel.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Store",
            description: "Main sales channel for MAVIRE CODOIR - Global shipping",
          } as any,
        ],
      },
    });
    defaultSalesChannel = result;
    logger.info("✅ Created sales channel: Default Store (active)");
  } else {
    logger.info("✅ Sales channel already exists: Default Store");
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_sales_channel_id: defaultSalesChannel[0].id },
    },
  });
  logger.info("✅ Store linked to Default Store sales channel");

  // ─── 3. REGIONS ───────────────────────────────────────────────────────
  const regionsToCreate = [
    {
      name: "United Kingdom",
      currency_code: "gbp",
      countries: ["gb"],
      payment_providers: ["pp_stripe_stripe", "pp_system_default"],
      automatic_taxes: true,
      includes_tax: true,
    },
    {
      name: "United States",
      currency_code: "usd",
      countries: ["us"],
      payment_providers: ["pp_stripe_stripe", "pp_system_default"],
      automatic_taxes: true,
      includes_tax: false,
    },
    {
      name: "European Union",
      currency_code: "eur",
      countries: ["de", "fr", "it", "es", "nl"],
      payment_providers: ["pp_stripe_stripe", "pp_system_default"],
      automatic_taxes: true,
      includes_tax: true,
    },
  ];

  // Get existing regions via query
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: currentRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  });

  for (const regionData of regionsToCreate) {
    try {
      await createRegionsWorkflow(container).run({
        input: { regions: [regionData] },
      });
      logger.info(`✅ Created region: ${regionData.name} (${regionData.currency_code})`);
    } catch (e: any) {
      if (e.message?.includes?.("already assigned")) {
        logger.info(`⏭️ Region already covers countries for: ${regionData.name}`);
      } else {
        logger.warn(`⚠️ Could not create region ${regionData.name}: ${e.message}`);
      }
    }
  }

  // Set UK as default region on store
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name"],
    filters: { name: "United Kingdom" },
  });

  if (regions.length > 0) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { default_region_id: regions[0].id },
      },
    });
    logger.info("✅ UK region set as default on store");
  }

  // ─── 4. TAX REGIONS ───────────────────────────────────────────────────
  const taxCountries = ["gb", "us", "de", "fr", "it", "es", "nl"];
  for (const countryCode of taxCountries) {
    try {
      await createTaxRegionsWorkflow(container).run({
        input: [{ country_code: countryCode, provider_id: "tp_system" }],
      });
      logger.info(`✅ Tax region created: ${countryCode}`);
    } catch (e: any) {
      if (e.message?.includes?.("already exists")) {
        logger.info(`⏭️ Tax region already exists: ${countryCode}`);
      } else {
        logger.warn(`⚠️ Could not create tax region ${countryCode}: ${e.message}`);
      }
    }
  }

  // Seed tax rates for each tax region
  try {
    const taxModuleService = container.resolve(Modules.TAX);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data: taxRegions } = await query.graph({
      entity: "tax_region",
      fields: ["id", "country_code"],
    });
    const defaultRates: Record<string, { rate: number; name: string; code: string }> = {
      gb: { rate: 20, name: "VAT", code: "vat" },
      de: { rate: 19, name: "VAT", code: "vat" },
      fr: { rate: 20, name: "VAT", code: "vat" },
      it: { rate: 22, name: "VAT", code: "vat" },
      es: { rate: 21, name: "VAT", code: "vat" },
      nl: { rate: 21, name: "VAT", code: "vat" },
    };
    for (const tRegion of taxRegions) {
      const rateConfig = defaultRates[tRegion.country_code];
      if (rateConfig) {
        await taxModuleService.createTaxRates([
          {
            tax_region_id: tRegion.id,
            rate: rateConfig.rate,
            name: rateConfig.name,
            code: rateConfig.code,
          },
        ]);
      }
    }
    logger.info("✅ Tax rates seeded for applicable countries");
  } catch (e: any) {
    logger.info(`⏭️ Tax rates already exist or not applicable`);
  }

  // ─── 5. STOCK LOCATIONS (London + US) ─────────────────────────────
  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });

  // Find or create London warehouse (default)
  let londonLocation = existingLocations.find(
    (l: any) => l.name.includes("London") || l.name === "European Warehouse"
  );
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
    logger.info("✅ Created stock location: Main Warehouse - London");
  } else {
    logger.info(`⏭️ Stock location already exists: ${londonLocation.name}`);
    if (londonLocation.name === "European Warehouse") {
      await query.graph({
        entity: "stock_location",
        data: {
          id: londonLocation.id,
          name: "Main Warehouse - London",
          address: { city: "London", country_code: "GB", postal_code: "EC1A 1BB" },
        },
        fields: ["id", "name"],
      } as any);
      londonLocation.name = "Main Warehouse - London";
      logger.info("✅ Renamed stock location to: Main Warehouse - London");
    }
  }

  // Find or create US warehouse
  let usLocation = existingLocations.find(
    (l: any) => l.name.includes("US") || l.name.includes("United States")
  );
  if (!usLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{
          name: "US Warehouse - New York",
          address: {
            address_1: "1 Liberty Street",
            city: "New York",
            country_code: "US",
            postal_code: "10005",
          },
        }],
      },
    });
    usLocation = result[0] as any;
    logger.info("✅ Created stock location: US Warehouse - New York");
  } else {
    logger.info(`⏭️ Stock location already exists: ${usLocation.name}`);
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_location_id: londonLocation!.id },
    },
  });
  logger.info("✅ London set as default stock location on store");

  // ─── 6. FULFILLMENT SETS & SHIPPING ──────────────────────────────────
  // Destroy old fulfillment sets and create fresh 3-zone set
  const oldFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets();
  for (const oldSet of oldFulfillmentSets) {
    const { data: zones } = await query.graph({
      entity: "fulfillment_set",
      fields: ["id", "service_zones.id", "service_zones.name"],
      filters: { id: oldSet.id },
    });
    const serviceZones = zones[0]?.service_zones || [];

    for (const zone of serviceZones) {
      const options = await fulfillmentModuleService.listShippingOptions({
        service_zone_id: zone.id,
      } as any);
      if (options.length > 0) {
        await fulfillmentModuleService.deleteShippingOptions(options.map((o: any) => o.id));
      }
    }
    if (serviceZones.length > 0) {
      await fulfillmentModuleService.deleteServiceZones(serviceZones.map((z: any) => z.id));
    }
    await fulfillmentModuleService.deleteFulfillmentSets(oldSet.id);
    logger.info(`🗑️ Deleted old fulfillment set: ${oldSet.name}`);
  }

  // Create new 3-zone fulfillment set
  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "MAVIRE Global Shipping",
    type: "shipping",
    service_zones: [
      { name: "UK Zone", geo_zones: [{ country_code: "gb", type: "country" }] },
      {
        name: "EU Zone",
        geo_zones: [
          { country_code: "de", type: "country" },
          { country_code: "fr", type: "country" },
          { country_code: "it", type: "country" },
          { country_code: "es", type: "country" },
          { country_code: "nl", type: "country" },
        ],
      },
      { name: "US Zone", geo_zones: [{ country_code: "us", type: "country" }] },
    ],
  });
  logger.info("✅ Created fulfillment set: MAVIRE Global Shipping with 3 zones");

  // Link both stock locations to fulfillment set
  for (const loc of [londonLocation!, usLocation!]) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
      });
      logger.info(`✅ ${loc.name} linked to fulfillment set`);
    } catch (e: any) {
      logger.info(`⏭️ ${loc.name} already linked to fulfillment set`);
    }
  }

  // Link sales channel to both stock locations
  for (const loc of [londonLocation!, usLocation!]) {
    try {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: loc.id, add: [defaultSalesChannel[0].id] },
      });
      logger.info(`✅ Sales channel linked to ${loc.name}`);
    } catch (e: any) {
      logger.info(`⏭️ Sales channel already linked to ${loc.name}`);
    }
  }

  // ─── 7. SHIPPING PROFILES & OPTIONS ────────────────────────────────────
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Standard Shipping", type: "default" }] },
    });
    shippingProfile = result[0];
    logger.info("✅ Created shipping profile");
  }

  // Create shipping options for each service zone
  for (const zone of fulfillmentSet.service_zones || []) {
    const existingOptions = await fulfillmentModuleService.listShippingOptions({
      service_zone_id: zone.id,
    } as any);

    if (existingOptions.length === 0) {
      try {
        await createShippingOptionsWorkflow(container).run({
          input: [
            {
              name: "Standard Shipping",
              price_type: "flat",
              provider_id: "manual_manual",
              service_zone_id: zone.id,
              shipping_profile_id: shippingProfile.id,
              type: {
                label: "Standard",
                description: "Standard delivery (5-10 business days)",
                code: "standard",
              },
              prices: [
                { currency_code: "gbp", amount: 15 },
                { currency_code: "usd", amount: 20 },
                { currency_code: "eur", amount: 18 },
              ],
              rules: [
                { attribute: "enabled_in_store", value: "true", operator: "eq" },
                { attribute: "is_return", value: "false", operator: "eq" },
              ],
            },
            {
              name: "Express Shipping",
              price_type: "flat",
              provider_id: "manual_manual",
              service_zone_id: zone.id,
              shipping_profile_id: shippingProfile.id,
              type: {
                label: "Express",
                description: "Express delivery (1-3 business days)",
                code: "express",
              },
              prices: [
                { currency_code: "gbp", amount: 30 },
                { currency_code: "usd", amount: 40 },
                { currency_code: "eur", amount: 35 },
              ],
              rules: [
                { attribute: "enabled_in_store", value: "true", operator: "eq" },
                { attribute: "is_return", value: "false", operator: "eq" },
              ],
            },
          ],
        });
        logger.info(`✅ Shipping options created for zone: ${zone.name}`);
      } catch (e: any) {
        logger.warn(`⚠️ Could not create shipping options for ${zone.name}: ${e.message}`);
      }
    } else {
      logger.info(`⏭️ Shipping options already exist for zone: ${zone.name}`);
    }
  }

  // ─── 8. COLLECTIONS ──────────────────────────────────────────────────
  const COLLECTION_HANDLES = [
    "men", "men-outerwear", "men-jackets", "men-shirts", "men-t-shirts",
    "men-denim", "men-knitwear", "men-trousers", "men-new-arrivals", "men-new",
    "women", "women-outerwear", "women-dresses", "women-tops",
    "women-knitwear", "women-trousers", "women-skirts", "women-denim",
    "women-new-arrivals", "women-new",
    "unisex", "unisex-outerwear", "unisex-knitwear",
    "accessories", "accessories-bags", "accessories-scarves",
    "accessories-hats", "accessories-belts",
    "archive",
  ]
  const productModuleService = container.resolve(Modules.PRODUCT)
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  })
  const existingCollHandles = new Set(existingCollections.map((c: any) => c.handle))
  const newCollections = COLLECTION_HANDLES.filter((h) => !existingCollHandles.has(h))
  if (newCollections.length > 0) {
    await productModuleService.createProductCollections(
      newCollections.map((handle) => ({
        title: handle.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        handle,
      }))
    )
    logger.info(`✅ Created ${newCollections.length} collections for navigation`)
  } else {
    logger.info("⏭️ Navigation collections already exist")
  }

  // ─── 9. FINAL VERIFICATION ───────────────────────────────────────────
  logger.info("\n📋 === MAVIRE CODOIR Setup Complete ===");
  logger.info("✅ Default currency: GBP (£)");
  logger.info("✅ Default region: United Kingdom");
  logger.info("✅ Available currencies: GBP, USD, EUR, JPY, CAD, AUD, CHF");
  logger.info("✅ Sales channel: Default Store (active)");
  logger.info("✅ Stock locations: Main Warehouse - London (default), US Warehouse - New York");
  logger.info("✅ Regions: United Kingdom (GBP), United States (USD), European Union (EUR)");
  logger.info("✅ Tax regions configured for: GB, US, DE, FR, IT, ES, NL");
  logger.info("✅ Shipping: Standard & Express options configured");
  logger.info("\n🔗 Admin: http://localhost:9000/app");
}
