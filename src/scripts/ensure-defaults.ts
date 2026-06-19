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
  { name: "United Kingdom", currency_code: "gbp", countries: ["gb"], payment_providers: ["pp_system_default", "pp_stripe_stripe", "pp_paypal_paypal"] },
  { name: "Europe", currency_code: "eur", countries: ["dk", "fr", "de", "it", "es", "se", "nl", "be", "at", "ie", "pt", "no", "ch"], payment_providers: ["pp_system_default", "pp_stripe_stripe", "pp_paypal_paypal"] },
  { name: "North America", currency_code: "usd", countries: ["us", "ca"], payment_providers: ["pp_system_default", "pp_stripe_stripe", "pp_paypal_paypal"] },
  { name: "Rest of World", currency_code: "usd", countries: ["au", "nz", "jp", "sg", "hk", "ae", "za", "br", "mx", "in", "kr", "il"], payment_providers: ["pp_system_default", "pp_stripe_stripe", "pp_paypal_paypal"] },
];

const SERVICE_ZONE_CONFIGS = [
  { name: "UK", countries: ["gb"] },
  { name: "Europe", countries: ["dk", "fr", "de", "it", "es", "se", "nl", "be", "at", "ie", "pt", "no", "ch"] },
  { name: "North America", countries: ["us", "ca"] },
  { name: "Rest of World", countries: ["au", "nz", "jp", "sg", "hk", "ae", "za", "br", "mx", "in", "kr", "il"] },
];

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
      const { data: allFs } = await query.graph({
        entity: "fulfillment_sets",
        fields: ["id", "name", "type"],
      });

      // Find existing fulfillment set linked to London by checking service zones
      let londonFs: any = null;
      for (const fs of (allFs || []) as any[]) {
        const existingZones = await (fulfillmentModuleService as any).listServiceZones({
          fulfillment_set: fs.id,
        });
        const hasGb = existingZones?.some((z: any) =>
          z.geo_zones?.some((g: any) => g.country_code === "gb")
        );
        if (hasGb) { londonFs = fs; break; }
      }

      // Create London Warehouse fulfillment set if none exists yet
      if (!londonFs) {
        try {
          await createLocationFulfillmentSetWorkflow(container).run({
            input: {
              location_id: london.id,
              fulfillment_set_data: { name: "London Warehouse", type: "shipping" },
            },
          });
          const { data: newFs } = await query.graph({
            entity: "fulfillment_sets",
            fields: ["id", "name", "type"],
          });
          londonFs = newFs?.find((fs: any) => fs.name === "London Warehouse");
          if (londonFs) logger.info("ensure-defaults: Created fulfillment set: London Warehouse");
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
          if (!existingZones?.length) {
            await (fulfillmentModuleService as any).createServiceZones({
              name: sz.name,
              fulfillment_set_id: londonFs.id,
              geo_zones: sz.countries.map((c: string) => ({ type: "country" as const, country_code: c })),
            });
            logger.info(`ensure-defaults: Created service zone: ${sz.name}`);
          }
        }
      }
    }

    // ── Fulfillment Provider Enablement ──
    try {
      await remoteLink.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: london.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      });
    } catch (_e: any) {
      // Already enabled — non-fatal
    }

    // ── Shipping Profile ──
    const existingProfiles = await (fulfillmentModuleService as any).listShippingProfiles();
    let standardProfile = existingProfiles?.find((p: any) => p.name === "Standard") as any;
    if (!standardProfile) {
      const created = await (fulfillmentModuleService as any).createShippingProfiles({
        name: "Standard",
        type: "standard",
      });
      standardProfile = Array.isArray(created) ? created[0] : created;
      logger.info("ensure-defaults: Created shipping profile: Standard");
    }

    // ── Shipping Options ──
    const { data: allFs } = await query.graph({
      entity: "fulfillment_sets",
      fields: ["id", "name"],
    });

    for (const fs of (allFs || []) as any[]) {
      const zones = await (fulfillmentModuleService as any).listServiceZones({
        fulfillment_set: fs.id,
      });

      for (const zone of (zones || []) as any[]) {
        const currency = REGION_CONFIGS.find((rc) =>
          rc.name.toLowerCase().replace(/\s+/g, "") === zone.name.toLowerCase().replace(/\s+/g, "")
        )?.currency_code || "gbp";

        const existingOptions = await (fulfillmentModuleService as any).listShippingOptions({
          service_zone: zone.id,
        });

        if (!existingOptions?.find((o: any) => o.name === "Standard Shipping")) {
          await createShippingOptionsWorkflow(container).run({
            input: [{
              name: "Standard Shipping",
              service_zone_id: zone.id,
              shipping_profile_id: standardProfile.id,
              provider_id: "manual_manual",
              price_type: "flat",
              type: { label: "Standard", description: "Standard delivery", code: "standard" },
              prices: [{ amount: 0, currency_code: currency }],
            }],
          });
          logger.info(`ensure-defaults: Created Standard Shipping for zone: ${zone.name}`);
        }

        if (!existingOptions?.find((o: any) => o.name === "Express Shipping")) {
          await createShippingOptionsWorkflow(container).run({
            input: [{
              name: "Express Shipping",
              service_zone_id: zone.id,
              shipping_profile_id: standardProfile.id,
              provider_id: "manual_manual",
              price_type: "flat",
              type: { label: "Express", description: "Express delivery (1-3 business days)", code: "express" },
              prices: [{ amount: 1500, currency_code: currency }],
            }],
          });
          logger.info(`ensure-defaults: Created Express Shipping for zone: ${zone.name}`);
        }

        // Clean up old shipping options from previous scripts
        const oldNames = ["UK Standard", "UK Express", "US Standard", "US Express", "EU Standard", "EU Express"];
        const staleOptions = existingOptions?.filter((o: any) => oldNames.includes(o.name));
        if (staleOptions?.length) {
          try {
            await (fulfillmentModuleService as any).deleteShippingOptions(staleOptions.map((o: any) => o.id));
            logger.info(`ensure-defaults: Removed ${staleOptions.length} stale option(s) from zone: ${zone.name}`);
          } catch {
            logger.info(`ensure-defaults: Could not delete stale options (non-fatal)`);
          }
        }
      }
    }

    logger.info("ensure-defaults: All defaults verified");
  } catch (e: any) {
    logger.error(`ensure-defaults: ${e.message}`);
  }
}
