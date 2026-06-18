import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const productModuleService = container.resolve(Modules.PRODUCT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["de", "dk", "se", "fr", "es", "it"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          } as any,
        ],
      } as any,
    });
    defaultSalesChannel = salesChannelResult;
  }

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
  logger.info("✅ Default currency set to GBP, all 7 currencies supported");

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Seeding region data...");
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries"],
  });

  const regionsToCreate = [
    {
      name: "Europe",
      currency_code: "eur",
      countries,
      payment_providers: ["pp_stripe_stripe", "pp_system_default"],
    },
    {
      name: "United Kingdom",
      currency_code: "gbp",
      countries: ["gb"],
      payment_providers: ["pp_stripe_stripe", "pp_system_default"],
      automatic_taxes: true,
    },
    {
      name: "United States",
      currency_code: "usd",
      countries: ["us"],
      payment_providers: ["pp_stripe_stripe", "pp_system_default"],
      automatic_taxes: true,
    },
  ];

  let region = existingRegions[0];
  for (const r of regionsToCreate) {
    const exists = existingRegions.find((er: any) => er.name === r.name);
    if (!exists) {
      const { result } = await createRegionsWorkflow(container).run({
        input: { regions: [r] },
      });
      logger.info(`✅ Created region: ${r.name}`);
      if (!region) region = result[0] as any;
    } else {
      logger.info(`⏭️ Region already exists: ${r.name}`);
      if (!region) region = exists;
    }
  }
  logger.info("Finished seeding regions.");

  // Set UK as default region on store
  try {
    const ukRegion = existingRegions.find((r: any) => r.name === "United Kingdom")
      || (await query.graph({
        entity: "region",
        fields: ["id"],
        filters: { name: "United Kingdom" },
      })).data[0];
    if (ukRegion) {
      await updateStoresWorkflow(container).run({
        input: {
          selector: { id: store.id },
          update: { default_region_id: ukRegion.id },
        },
      });
      logger.info("✅ UK region set as default on store");
    }
  } catch (e) {
    logger.warn("⚠️ Could not set default region on store");
  }

  logger.info("Seeding tax regions...");
  const { data: existingTaxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["country_code"],
  });
  const existingTaxCountries = new Set(existingTaxRegions.map((tr: any) => tr.country_code));
  const taxCountries = [...countries, "gb", "us"];
  const newTaxCountries = taxCountries.filter((c) => !existingTaxCountries.has(c));
  if (newTaxCountries.length > 0) {
    await createTaxRegionsWorkflow(container).run({
      input: newTaxCountries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  }
  logger.info("Finished seeding tax regions.");

  // Seed tax rates for each tax region
  try {
    const taxModuleService = container.resolve(Modules.TAX);
    const { data: taxRegions } = await query.graph({
      entity: "tax_region",
      fields: ["id", "country_code"],
    });
    const defaultRates: Record<string, { rate: number; name: string; code: string }> = {
      gb: { rate: 20, name: "VAT", code: "vat" },
      de: { rate: 19, name: "VAT", code: "vat" },
      dk: { rate: 25, name: "VAT", code: "vat" },
      se: { rate: 25, name: "VAT", code: "vat" },
      fr: { rate: 20, name: "VAT", code: "vat" },
      es: { rate: 21, name: "VAT", code: "vat" },
      it: { rate: 22, name: "VAT", code: "vat" },
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
    logger.info("✅ Tax rates seeded for all applicable countries");
  } catch (e: any) {
    logger.warn(`⚠️ Could not seed tax rates (OK to skip): ${e.message}`);
  }

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Main Warehouse - London",
          address: {
            address_1: "1 London Bridge",
            city: "London",
            country_code: "GB",
            province: "Greater London",
            postal_code: "EC1A 1BB",
          },
        },
        {
          name: "US Warehouse - New York",
          address: {
            address_1: "1 Liberty Street",
            city: "New York",
            country_code: "US",
            province: "NY",
            postal_code: "10005",
          },
        },
      ],
    },
  });
  const londonLocation = stockLocationResult[0];
  const usLocation = stockLocationResult[1];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: londonLocation.id,
      },
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  // Create or reuse fulfillment set with separate service zones
  let fulfillmentSet;
  const existingSets = await fulfillmentModuleService.listFulfillmentSets({
    name: "MAVIRE Global Shipping",
  });
  if (existingSets.length > 0) {
    fulfillmentSet = existingSets[0];
    const { data: zones } = await query.graph({
      entity: "fulfillment_set",
      fields: ["id", "service_zones.id", "service_zones.name"],
      filters: { id: fulfillmentSet.id },
    });
    fulfillmentSet.service_zones = zones[0]?.service_zones || [];
    logger.info(`⏭️ Fulfillment set already exists (${fulfillmentSet.service_zones.length} zones)`);
  } else {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "MAVIRE Global Shipping",
      type: "shipping",
      service_zones: [
        {
          name: "United Kingdom",
          geo_zones: [{ country_code: "gb", type: "country" }],
        },
        {
          name: "Europe",
          geo_zones: [
            { country_code: "de", type: "country" },
            { country_code: "dk", type: "country" },
            { country_code: "se", type: "country" },
            { country_code: "fr", type: "country" },
            { country_code: "es", type: "country" },
            { country_code: "it", type: "country" },
          ],
        },
        {
          name: "United States",
          geo_zones: [{ country_code: "us", type: "country" }],
        },
      ],
    });
    logger.info("✅ Created fulfillment set: MAVIRE Global Shipping");
  }

  for (const loc of [londonLocation, usLocation]) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: loc.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: fulfillmentSet.id,
        },
      });
      logger.info(`✅ ${loc.name} linked to fulfillment set`);
    } catch (e: any) {
      logger.info(`⏭️ ${loc.name} already linked to fulfillment set`);
    }
  }

  // Create shipping options for each service zone with prices in all currencies
  for (const zone of fulfillmentSet.service_zones) {
    const existingOptions = await fulfillmentModuleService.listShippingOptions({
      service_zone_id: zone.id,
    } as any);
    if (existingOptions.length > 0) {
      logger.info(`⏭️ Shipping options already exist for zone: ${zone.name}`);
      continue;
    }
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
            description: "Ship in 2-3 days.",
            code: "standard",
          },
          prices: [
            { currency_code: "usd", amount: 10 },
            { currency_code: "eur", amount: 10 },
            { currency_code: "gbp", amount: 8 },
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
            description: "Ship in 24 hours.",
            code: "express",
          },
          prices: [
            { currency_code: "usd", amount: 10 },
            { currency_code: "eur", amount: 10 },
            { currency_code: "gbp", amount: 8 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
    logger.info(`✅ Shipping options created for zone: ${zone.name}`);
  }
  logger.info("Finished seeding fulfillment data.");

  for (const loc of [londonLocation, usLocation]) {
    try {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: {
          id: loc.id,
          add: [defaultSalesChannel[0].id],
        },
      });
      logger.info(`✅ Sales channel linked to ${loc.name}`);
    } catch (e: any) {
      logger.info(`⏭️ Sales channel already linked to ${loc.name}`);
    }
  }
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding collections...");
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
  ];
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  });
  const existingCollHandles = new Set(existingCollections.map((c: any) => c.handle));
  const newCollections = COLLECTION_HANDLES.filter((h) => !existingCollHandles.has(h));
  if (newCollections.length > 0) {
    await productModuleService.createProductCollections(
      newCollections.map((handle) => ({
        title: handle.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        handle,
      }))
    );
    logger.info(`✅ Created ${newCollections.length} collections`);
  } else {
    logger.info("⏭️ Collections already exist");
  }

  // Build collection handle→id map for product assignment
  const { data: allCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  });
  const collectionMap = new Map(allCollections.map((c: any) => [c.handle, c.id]));

  // Create product tags
  const tagValues = ["men", "new", "women", "unisex", "accessories", "outerwear", "jackets", "shirts", "t-shirts", "denim", "knitwear", "trousers", "dresses", "tops", "skirts", "bags", "scarves", "hats", "belts"];
  const { data: existingTags } = await query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  });
  const existingTagValues = new Set(existingTags.map((t: any) => t.value));
  const newTagValues = tagValues.filter((v) => !existingTagValues.has(v));
  if (newTagValues.length > 0) {
    await productModuleService.createProductTags(newTagValues.map((value) => ({ value })));
  }
  const { data: allTags } = await query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  });
  const tagMap = new Map(allTags.map((t: any) => [t.value, t.id]));

  logger.info("Seeding product data...");

  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const existingCategoryNames = new Set(existingCategories.map((c: any) => c.name));
  const desiredCategories = ["Shirts", "Sweatshirts", "Pants", "Merch", "Jackets", "Outerwear", "Denim", "Knitwear"];
  const newCategories = desiredCategories.filter((n) => !existingCategoryNames.has(n));

  let categoryResult: any[] = existingCategories;
  if (newCategories.length > 0) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: newCategories.map((name) => ({
          name,
          is_active: true,
        })),
      },
    });
    categoryResult = [...existingCategories, ...result];
    logger.info(`✅ Created ${newCategories.length} product categories`);
  } else {
    logger.info("⏭️ Product categories already exist");
  }

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const existingHandles = new Set(existingProducts.map((p: any) => p.handle));
  const productsToCreate = [
    {
      title: "Archive Tee",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Shirts")!.id,
      ],
      description: "A premium essential with a lived-in feel. Cut from heavyweight cotton jersey and finished with signature MAVIRE CODOIR detailing.",
      handle: "archive-tee",
      weight: 400,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      collection_id: collectionMap.get("men"),
      tag_ids: [tagMap.get("men"), tagMap.get("new"), tagMap.get("t-shirts")].filter(Boolean),
      metadata: { production_status: "in_stock" },
      images: [
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png" },
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png" },
      ],
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: ["S", "M", "L", "XL"].map((s) => ({
        title: s,
        sku: `ARCHIVE-TEE-${s}`,
        options: { Size: s },
        prices: [
          { amount: 10500, currency_code: "gbp" },
          { amount: 12500, currency_code: "eur" },
          { amount: 13500, currency_code: "usd" },
        ],
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    },
    {
      title: "Long Sleeve Tee",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Shirts")!.id,
      ],
      description: "A long-sleeve essential crafted from premium cotton jersey. Designed for year-round layering with a clean, minimalist finish.",
      handle: "long-sleeve-tee",
      weight: 450,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      collection_id: collectionMap.get("men"),
      tag_ids: [tagMap.get("men"), tagMap.get("new"), tagMap.get("t-shirts")].filter(Boolean),
      metadata: { production_status: "in_stock" },
      images: [
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png" },
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png" },
      ],
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: ["S", "M", "L", "XL"].map((s) => ({
        title: s,
        sku: `LS-TEE-${s}`,
        options: { Size: s },
        prices: [
          { amount: 12500, currency_code: "gbp" },
          { amount: 14500, currency_code: "eur" },
          { amount: 16000, currency_code: "usd" },
        ],
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    },
    {
      title: "Overshirt",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Shirts")!.id,
      ],
      description: "A structured overshirt built from heavyweight cotton twill. Relaxed fit with a utilitarian sensibility.",
      handle: "overshirt",
      weight: 600,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      collection_id: collectionMap.get("men"),
      tag_ids: [tagMap.get("men"), tagMap.get("shirts")].filter(Boolean),
      metadata: { production_status: "in_stock" },
      images: [
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
      ],
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: ["S", "M", "L", "XL"].map((s) => ({
        title: s,
        sku: `OVERSHIRT-${s}`,
        options: { Size: s },
        prices: [
          { amount: 27500, currency_code: "gbp" },
          { amount: 32500, currency_code: "eur" },
          { amount: 35000, currency_code: "usd" },
        ],
        ...(s === "S" ? { metadata: { production_status: "sold_out" } } : {}),
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    },
    {
      title: "Wide Leg Trouser",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Pants")!.id,
      ],
      description: "A relaxed wide-leg silhouette cut from premium wool-blend fabric. Pleated front with a clean, architectural drape.",
      handle: "wide-leg-trouser",
      weight: 500,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      collection_id: collectionMap.get("men"),
      tag_ids: [tagMap.get("men"), tagMap.get("trousers")].filter(Boolean),
      metadata: { production_status: "in_stock" },
      images: [
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png" },
      ],
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: ["S", "M", "L", "XL"].map((s) => ({
        title: s,
        sku: `WIDE-LEG-${s}`,
        options: { Size: s },
        prices: [
          { amount: 22500, currency_code: "gbp" },
          { amount: 26500, currency_code: "eur" },
          { amount: 28500, currency_code: "usd" },
        ],
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    },
    {
      title: "Raw Selvedge Denim",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Denim")!.id,
      ],
      description: "Unsanforized raw selvedge denim woven on vintage looms. A straight-leg silhouette that evolves uniquely with wear.",
      handle: "raw-selvedge-denim",
      weight: 700,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      collection_id: collectionMap.get("men"),
      tag_ids: [tagMap.get("men"), tagMap.get("denim")].filter(Boolean),
      metadata: { production_status: "pre_order", estimated_arrival: "September 2026" },
      images: [
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png" },
      ],
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: ["S", "M", "L", "XL"].map((s) => ({
        title: s,
        sku: `SELVEDGE-${s}`,
        options: { Size: s },
        prices: [
          { amount: 29500, currency_code: "gbp" },
          { amount: 34500, currency_code: "eur" },
          { amount: 37500, currency_code: "usd" },
        ],
        ...(s === "S" ? { metadata: { production_status: "sold_out" } } : {}),
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    },
    {
      title: "Structured Jacket",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Jackets")!.id,
      ],
      description: "A sharply structured jacket cut from Japanese tech-cotton canvas. Architectural shoulders with a sculpted waist.",
      handle: "structured-jacket",
      weight: 800,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      collection_id: collectionMap.get("men"),
      tag_ids: [tagMap.get("men"), tagMap.get("jackets")].filter(Boolean),
      metadata: { production_status: "pre_order", estimated_arrival: "October 2026" },
      images: [
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
      ],
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: ["S", "M", "L", "XL"].map((s) => ({
        title: s,
        sku: `STRUCT-JKT-${s}`,
        options: { Size: s },
        prices: [
          { amount: 49500, currency_code: "gbp" },
          { amount: 57500, currency_code: "eur" },
          { amount: 62500, currency_code: "usd" },
        ],
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    },
    {
      title: "Long Coat",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Outerwear")!.id,
      ],
      description: "A floor-sweeping coat in heavy Italian wool melton. Minimal construction with a sculptural silhouette.",
      handle: "long-coat",
      weight: 1200,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      collection_id: collectionMap.get("men"),
      tag_ids: [tagMap.get("men"), tagMap.get("outerwear")].filter(Boolean),
      metadata: { production_status: "future_run" },
      images: [
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
      ],
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: ["S", "M", "L", "XL"].map((s) => ({
        title: s,
        sku: `LONG-COAT-${s}`,
        options: { Size: s },
        prices: [
          { amount: 89500, currency_code: "gbp" },
          { amount: 105000, currency_code: "eur" },
          { amount: 112500, currency_code: "usd" },
        ],
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    },
    {
      title: "Sankofa Coat",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Outerwear")!.id,
      ],
      description: "Our ceremonial Sankofa Coat — a hand-finished statement piece. Adinkra-inspired embroidery across sculpted wool cloth.",
      handle: "sankofa-coat",
      weight: 1400,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      collection_id: collectionMap.get("men"),
      tag_ids: [tagMap.get("men"), tagMap.get("outerwear")].filter(Boolean),
      metadata: { production_status: "pre_order", estimated_arrival: "December 2026" },
      images: [
        { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
      ],
      options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
      variants: ["S", "M", "L", "XL"].map((s) => ({
        title: s,
        sku: `SANKOFA-${s}`,
        options: { Size: s },
        prices: [
          { amount: 125000, currency_code: "gbp" },
          { amount: 145000, currency_code: "eur" },
          { amount: 157500, currency_code: "usd" },
        ],
      })),
      sales_channels: [{ id: defaultSalesChannel[0].id }],
    },
  ];
  const newProducts = productsToCreate.filter(
    (p) => !existingHandles.has(p.handle)
  );
  if (newProducts.length > 0) {
    await createProductsWorkflow(container).run({
      input: {
        products: newProducts,
      },
    });
    logger.info(`✅ Created ${newProducts.length} products`);
  } else {
    logger.info("⏭️ Products already exist");
  }
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    for (const loc of [londonLocation, usLocation]) {
      inventoryLevels.push({
        location_id: loc.id,
        stocked_quantity: 1000000,
        inventory_item_id: inventoryItem.id,
      });
    }
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");

  // Create "House Standard Pricing" Price List
  logger.info("Seeding House Standard Pricing price list...");

  const { data: existingPriceLists } = await query.graph({
    entity: "price_list",
    fields: ["id", "title"],
  });
  const houseStandardExists = existingPriceLists.some(
    (pl: any) => pl.title === "House Standard Pricing"
  );

  if (houseStandardExists) {
    logger.info("⏭️ House Standard Pricing price list already exists");
  } else {
    const priceListSkus = [
      "ARCHIVE-TEE", "LS-TEE", "OVERSHIRT", "WIDE-LEG",
      "SELVEDGE", "STRUCT-JKT", "LONG-COAT", "SANKOFA",
    ];

    const gbpPrices: Record<string, number> = {
      "ARCHIVE-TEE": 10500,
      "LS-TEE": 12500,
      "OVERSHIRT": 27500,
      "WIDE-LEG": 22500,
      "SELVEDGE": 29500,
      "STRUCT-JKT": 49500,
      "LONG-COAT": 89500,
      "SANKOFA": 125000,
    };

    const { data: priceListVariants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku"],
    });

    const housePricingItems = priceListVariants
      .filter((v: any) => priceListSkus.some((prefix) => v.sku?.startsWith(prefix)))
      .map((v: any) => ({
        variant_id: v.id,
        amount: gbpPrices[priceListSkus.find((p) => v.sku.startsWith(p))!],
        currency_code: "gbp",
      }));

    if (housePricingItems.length > 0) {
      await createPriceListsWorkflow(container).run({
        input: {
          price_lists_data: [
            {
              title: "House Standard Pricing",
              description: "Standard retail pricing for all MAVIRE CODOIR products",
              type: "sale",
              status: "active",
              prices: housePricingItems as any,
            },
          ],
        } as any,
      });
      logger.info(`✅ Created House Standard Pricing price list with ${housePricingItems.length} items`);
    }
  }

  logger.info("Finished seeding House Standard Pricing price list.");
}
