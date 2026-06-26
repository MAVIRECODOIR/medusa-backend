import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  createRegionsWorkflow,
  updateRegionsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

const REGION_CONFIGS = [
  { name: "United Kingdom", currency_code: "gbp", countries: ["gb"], payment_providers: ["pp_system_default", "pp_stripe_stripe", "pp_paypal_paypal", "pp_paypal_card_paypal_card"] },
  { name: "Europe", currency_code: "eur", countries: ["dk", "fr", "de", "it", "es", "se", "nl", "be", "at", "ie", "pt", "no", "ch"], payment_providers: ["pp_system_default", "pp_stripe_stripe", "pp_paypal_paypal", "pp_paypal_card_paypal_card"] },
  { name: "North America", currency_code: "usd", countries: ["us", "ca"], payment_providers: ["pp_system_default", "pp_stripe_stripe", "pp_paypal_paypal", "pp_paypal_card_paypal_card"] },
  { name: "Rest of World", currency_code: "usd", countries: ["au", "nz", "jp", "sg", "hk", "ae", "za", "br", "mx", "in", "kr", "il"], payment_providers: ["pp_system_default", "pp_stripe_stripe", "pp_paypal_paypal", "pp_paypal_card_paypal_card"] },
];

const SERVICE_ZONE_CONFIGS = [
  { name: "UK Zone", countries: ["gb"] },
  { name: "Europe Zone", countries: ["dk", "fr", "de", "it", "es", "se", "nl", "be", "at", "ie", "pt", "no", "ch", "pl", "cz"] },
  { name: "North America Zone", countries: ["us", "ca"] },
  { name: "Rest of World Zone", countries: ["au", "nz", "jp", "sg", "hk", "ae", "za", "br", "mx", "in", "kr", "il", "cn", "ar", "ru"] },
];

const SHIPPING_CONFIG: Record<string, { name: string; prices: { currency_code: string; amount: number }[]; description: string; label: string; code: string }[]> = {
  "UK Zone": [
    { name: "Complimentary Standard Delivery", prices: [{ currency_code: "gbp", amount: 0 }], description: "Complimentary standard delivery within UK", label: "Standard", code: "standard-uk" },
    { name: "Express Delivery", prices: [{ currency_code: "gbp", amount: 800 }], description: "Express delivery within UK", label: "Express", code: "express-uk" },
  ],
  "Europe Zone": [
    { name: "International Standard Delivery", prices: [{ currency_code: "gbp", amount: 1200 }, { currency_code: "eur", amount: 1500 }], description: "International standard delivery to Europe", label: "International Standard", code: "international-standard-europe" },
    { name: "International Express Delivery", prices: [{ currency_code: "gbp", amount: 2000 }, { currency_code: "eur", amount: 2500 }], description: "International express delivery to Europe", label: "International Express", code: "international-express-europe" },
  ],
  "North America Zone": [
    { name: "International Standard Delivery", prices: [{ currency_code: "gbp", amount: 1800 }, { currency_code: "usd", amount: 2500 }], description: "International standard delivery to North America", label: "International Standard", code: "international-standard-north-america" },
    { name: "International Express Delivery", prices: [{ currency_code: "gbp", amount: 3000 }, { currency_code: "usd", amount: 4000 }], description: "International express delivery to North America", label: "International Express", code: "international-express-north-america" },
  ],
  "Rest of World Zone": [
    { name: "International Standard Delivery", prices: [{ currency_code: "gbp", amount: 2500 }, { currency_code: "usd", amount: 3500 }], description: "International standard delivery to Rest of World", label: "International Standard", code: "international-standard-rest-of-world" },
    { name: "International Express Delivery", prices: [{ currency_code: "gbp", amount: 4000 }, { currency_code: "usd", amount: 5500 }], description: "International express delivery to Rest of World", label: "International Express", code: "international-express-rest-of-world" },
  ],
};

export default async function ensureDefaults({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModuleService = container.resolve(Modules.STORE);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const regionModuleService = container.resolve(Modules.REGION);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  const [store] = await storeModuleService.listStores();
  if (!store) {
    logger.error("ensure-defaults: No store found");
    return;
  }

  try {
    // ── Store name ──
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { name: "MAVIRE CODOIR" },
      },
    });

    // ── Default Sales Channel ──
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

    await salesChannelModuleService.updateSalesChannels(
      { id: defaultSalesChannel[0].id },
      {
        metadata: {
          brand: "Mavire Codoir",
          domain: "www.mavirecodoir.com",
          order_source: "storefront",
        },
      }
    );

    // ── Stock Locations ──
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

    // ── Regions ──
    // Unassign countries that belong to our target config from old legacy regions
    const { data: allRegions } = await query.graph({
      entity: "regions",
      fields: ["id", "name", "countries.iso_2"],
    });
    for (const rc of REGION_CONFIGS) {
      for (const cc of rc.countries) {
        const oldRegion = (allRegions || []).find((r: any) =>
          r.name !== rc.name && r.countries?.some((c: any) => c.iso_2 === cc)
        );
        if (oldRegion) {
          const keptCountries = (oldRegion.countries || [])
            .filter((c: any) => c.iso_2 !== cc)
            .map((c: any) => c.iso_2);
          await regionModuleService.updateRegions(oldRegion.id, { countries: keptCountries });
          logger.info(`ensure-defaults: Freed country "${cc}" from region "${oldRegion.name}"`);
        }
      }
    }

    for (const rc of REGION_CONFIGS) {
      const existing = await regionModuleService.listRegions({ name: rc.name });
      if (existing.length === 0) {
        await createRegionsWorkflow(container).run({
          input: {
            regions: [{
              name: rc.name,
              currency_code: rc.currency_code,
              countries: rc.countries,
              payment_providers: rc.payment_providers,
            }],
          },
        });
        logger.info(`ensure-defaults: Created region: ${rc.name}`);
      } else {
        await updateRegionsWorkflow(container).run({
          input: {
            selector: { id: existing[0].id },
            update: {
              payment_providers: rc.payment_providers,
            },
          },
        });
      }
    }

    // ── Fulfillment Sets & Service Zones ──
    const locations = await getLocations();
    const london = locations.find((l: any) => l.name.includes("London"));

    if (london) {
      // Find fulfillment set linked to London via location_fulfillment_set link table
      let londonFs: any = null;
      {
        const { data: links } = await query.graph({
          entity: "location_fulfillment_set",
          fields: ["fulfillment_set_id", "stock_location_id"],
          filters: { stock_location_id: [london.id] },
        });
        const linkedIds = (links || []).map((l: any) => l.fulfillment_set_id).filter(Boolean);
        if (linkedIds.length > 0) {
          const { data: fsets } = await query.graph({
            entity: "fulfillment_sets",
            fields: ["id", "name", "type"],
            filters: { id: linkedIds },
          });
          londonFs = (fsets || [])[0];
        }
      }

      // If no linked set found, fallback or create
      if (!londonFs) {
        // Fallback: find by name (for recovery after migration)
        const { data: allFs } = await query.graph({
          entity: "fulfillment_sets",
          fields: ["id", "name", "type"],
        });
        londonFs = (allFs || []).find((fs: any) =>
          fs.name === "Main Warehouse - London shipping" || fs.name === "London Warehouse"
        );
      }

      // Create fulfillment set if still none found
      if (!londonFs) {
        try {
          await createLocationFulfillmentSetWorkflow(container).run({
            input: {
              location_id: london.id,
              fulfillment_set_data: { name: "Main Warehouse - London shipping", type: "shipping" },
            },
          });
          const { data: newFs } = await query.graph({
            entity: "fulfillment_sets",
            fields: ["id", "name", "type"],
          });
          londonFs = (newFs || []).find((fs: any) => fs.name === "Main Warehouse - London shipping");
          if (londonFs) logger.info("ensure-defaults: Created fulfillment set: Main Warehouse - London shipping");
        } catch (e: any) {
          logger.error(`ensure-defaults: Error creating fulfillment set: ${e.message}`);
        }
      }

      if (londonFs) {
        for (const sz of SERVICE_ZONE_CONFIGS) {
          const existingZones = await (fulfillmentModuleService as any).listServiceZones({
            fulfillment_set: londonFs.id,
            name: sz.name,
          });
          const geoZones = sz.countries.map((c: string) => ({ type: "country" as const, country_code: c }));
          if (!existingZones?.length) {
            await (fulfillmentModuleService as any).createServiceZones({
              name: sz.name,
              fulfillment_set_id: londonFs.id,
              geo_zones: geoZones,
            });
            logger.info(`ensure-defaults: Created service zone: ${sz.name}`);
          } else {
            // Update existing zone's geo zones to match current config
            await (fulfillmentModuleService as any).updateServiceZones(existingZones[0].id, {
              geo_zones: geoZones,
            });
          }
        }
      }
    }

    // ── Fulfillment Provider Enablement ──
    for (const fp of ["manual_manual", "shippo_shippo"]) {
      try {
        await remoteLink.create({
          [Modules.STOCK_LOCATION]: { stock_location_id: london.id },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: fp },
        });
        logger.info(`ensure-defaults: Linked ${fp} to London stock location`);
      } catch (_e: any) {
        // Already enabled — non-fatal
      }
    }

    // ── Shipping Profile ──
    const existingProfiles = await (fulfillmentModuleService as any).listShippingProfiles();
    let defaultProfile = existingProfiles?.find((p: any) => p.name === "Default Shipping Profile" || p.type === "default") as any;

    // ── Shipping Options ──
    // Clean up: delete all shipping options from legacy fulfillment sets (prevent duplicates)
    const { data: allFs } = await query.graph({
      entity: "fulfillment_sets",
      fields: ["id", "name"],
    });

    const LONDON_FS_NAMES = ["Main Warehouse - London shipping", "London Warehouse"];
    for (const fs of (allFs || []) as any[]) {
      if (!LONDON_FS_NAMES.includes(fs.name)) {
        const legacyZones = await (fulfillmentModuleService as any).listServiceZones({
          fulfillment_set: fs.id,
        });
        for (const lz of (legacyZones || []) as any[]) {
          const legacyOpts = await (fulfillmentModuleService as any).listShippingOptions({
            service_zone: lz.id,
          });
          if (legacyOpts?.length) {
            await (fulfillmentModuleService as any).deleteShippingOptions(legacyOpts.map((o: any) => o.id));
            logger.info(`ensure-defaults: Cleared ${legacyOpts.length} legacy option(s) from FS: ${fs.name}`);
          }
        }
      }
    }

    // Recreate shipping options on London zones from config
    const targetFs = (allFs || []).find((fs: any) => LONDON_FS_NAMES.includes(fs.name));
    if (targetFs) {
      const zones = await (fulfillmentModuleService as any).listServiceZones({
        fulfillment_set: targetFs.id,
      });

      // Delete existing options in London Warehouse zones (clean slate)
      for (const zone of (zones || []) as any[]) {
        const existingOptions = await (fulfillmentModuleService as any).listShippingOptions({
          service_zone: zone.id,
        });
        if (existingOptions?.length) {
          await (fulfillmentModuleService as any).deleteShippingOptions(existingOptions.map((o: any) => o.id));
        }
      }

      // Create per-zone configured options (all use manual flat-rate — Shippo is used
      // only for fulfillment label creation behind the scenes)
      for (const zone of (zones || []) as any[]) {
        const zoneConfig = SHIPPING_CONFIG[zone.name];
        if (!zoneConfig) continue;

        for (const opt of zoneConfig) {
          const typeLabel = `${opt.name} (${zone.name})`;
          const existing = await (fulfillmentModuleService as any).listShippingOptionTypes({ label: typeLabel });
          const typeData = existing?.length
            ? { label: existing[0].label, description: existing[0].description, code: existing[0].code }
            : await (fulfillmentModuleService as any).createShippingOptionTypes({
                label: typeLabel, description: opt.description, code: opt.code,
              }).then((t: any) => ({ label: t.label, description: t.description, code: t.code }));

          await createShippingOptionsWorkflow(container).run({
            input: [{
              name: opt.name,
              service_zone_id: zone.id,
              shipping_profile_id: defaultProfile.id,
              provider_id: "manual_manual",
              price_type: "flat" as const,
              type: typeData,
              prices: opt.prices,
            }],
          });
        }
        logger.info(`ensure-defaults: Created ${zoneConfig.length} option(s) for zone: ${zone.name}`);
      }
    }

    logger.info("ensure-defaults: All defaults verified");
  } catch (e: any) {
    logger.error(`ensure-defaults: ${e.message}`);
  }
}
