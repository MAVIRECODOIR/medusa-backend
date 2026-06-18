import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows";

export default async function fixFulfillment({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // Get all stock locations
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  const locMap = Object.fromEntries(locations.map((l: any) => [l.name, l]));
  const london = locMap["Main Warehouse - London"];
  const us = locMap["US Warehouse - New York"];
  const eur = locMap["European Warehouse - Amsterdam"];

  if (!london || !us || !eur) {
    logger.error("Could not find all 3 stock locations");
    return;
  }
  logger.info(`Found: ${london.name}, ${us.name}, ${eur.name}`);

  // ─── 1. Delete all existing fulfillment sets ──────────────────────
  const oldSets = await fulfillmentModuleService.listFulfillmentSets();
  for (const oldSet of oldSets) {
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
        logger.info(`  Deleted ${options.length} shipping options for zone ${zone.name}`);
      }
    }
    if (serviceZones.length > 0) {
      await fulfillmentModuleService.deleteServiceZones(serviceZones.map((z: any) => z.id));
      logger.info(`  Deleted ${serviceZones.length} service zones for set ${oldSet.name}`);
    }
    // Remove location-fulfillment set links first
    const { data: links } = await query.graph({
      entity: "location_fulfillment_set",
      fields: ["id", "stock_location_id"],
      filters: { fulfillment_set_id: oldSet.id },
    });
    if (links.length > 0) {
      await query.graph({
        entity: "location_fulfillment_set",
        data: links.map((l: any) => ({ id: l.id })),
        fields: [],
      } as any);
    }
    await fulfillmentModuleService.deleteFulfillmentSets(oldSet.id);
    logger.info(`  Deleted fulfillment set: ${oldSet.name}`);
  }

  // Remove dangling location-fulfillment_set links
  const { data: orphanLinks } = await query.graph({
    entity: "location_fulfillment_set",
    fields: ["id"],
  });
  if (orphanLinks.length > 0) {
    await query.graph({
      entity: "location_fulfillment_set",
      data: orphanLinks.map((l: any) => ({ id: l.id })),
      fields: [],
    } as any);
    logger.info(`Cleaned ${orphanLinks.length} orphan location-fulfillment_set links`);
  }

  // ─── 2. Create per-location fulfillment sets ──────────────────────
  const zoneConfigs: Record<string, { name: string; geo_zones: { country_code: string; type: string }[] }> = {
    "Main Warehouse - London": {
      name: "UK Zone",
      geo_zones: [{ country_code: "gb", type: "country" }],
    },
    "US Warehouse - New York": {
      name: "US Zone",
      geo_zones: [{ country_code: "us", type: "country" }],
    },
    "European Warehouse - Amsterdam": {
      name: "EU Zone",
      geo_zones: [
        { country_code: "de", type: "country" },
        { country_code: "fr", type: "country" },
        { country_code: "it", type: "country" },
        { country_code: "es", type: "country" },
        { country_code: "nl", type: "country" },
      ],
    },
  };

  // Get shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;
  if (!shippingProfile) {
    logger.error("No default shipping profile found");
    return;
  }

  for (const loc of [london, us, eur]) {
    const cfg = zoneConfigs[loc.name];
    logger.info(`\n=== Setting up ${loc.name} ===`);

    // Create fulfillment set with one service zone
    const fs = await fulfillmentModuleService.createFulfillmentSets({
      name: `${loc.name} shipping`,
      type: "shipping",
      service_zones: [cfg as any],
    });
    logger.info(`  Created fulfillment set: ${fs.name}`);

    const zoneId = fs.service_zones?.[0]?.id || (await query.graph({
      entity: "fulfillment_set",
      fields: ["service_zones.id"],
      filters: { id: fs.id },
    })).data[0]?.service_zones?.[0]?.id;
    if (!zoneId) {
      logger.error("  No service zone ID found");
      continue;
    }

    // Link location to fulfillment set
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fs.id },
      });
      logger.info("  Linked to fulfillment set");
    } catch (e: any) {
      logger.info("  Already linked to fulfillment set");
    }

    // Link location to fulfillment provider
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      });
      logger.info("  Linked to manual fulfillment provider");
    } catch (e: any) {
      logger.info("  Already linked to fulfillment provider");
    }

    // Create shipping options
    const zoneName = cfg.name;
    const existingOptions = await fulfillmentModuleService.listShippingOptions({
      service_zone_id: zoneId,
    } as any);
    if (existingOptions.length === 0) {
      const prefix = cfg.name.replace(" Zone", "");
      try {
        await createShippingOptionsWorkflow(container).run({
          input: [
            {
              name: `${prefix} Standard`,
              price_type: "flat",
              provider_id: "manual_manual",
              service_zone_id: zoneId,
              shipping_profile_id: shippingProfile.id,
              type: {
                label: `${prefix} Standard`,
                description: "Standard delivery (5-10 business days)",
                code: `standard-${prefix.toLowerCase()}`,
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
              name: `${prefix} Express`,
              price_type: "flat",
              provider_id: "manual_manual",
              service_zone_id: zoneId,
              shipping_profile_id: shippingProfile.id,
              type: {
                label: `${prefix} Express`,
                description: "Express delivery (1-3 business days)",
                code: `express-${prefix.toLowerCase()}`,
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
        logger.info(`  Created Standard + Express shipping for ${zoneName}`);
      } catch (e: any) {
        logger.warn(`  Could not create shipping options: ${e.message}`);
      }
    } else {
      logger.info(`  Shipping options already exist for ${zoneName}`);
    }
  }

  // Also link sales channels for US (it might be missing Default Sales Channel)
  const { data: defaultSalesChannel } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: "Default Sales Channel" },
  });

  for (const loc of [london, us, eur]) {
    if (defaultSalesChannel?.[0]) {
      try {
        const { data: existingLinks } = await query.graph({
          entity: "sales_channel_stock_location",
          fields: ["id"],
          filters: {
            stock_location_id: loc.id,
            sales_channel_id: defaultSalesChannel[0].id,
          },
        });
        if (!existingLinks.length) {
          await query.graph({
            entity: "sales_channel_stock_location",
            data: {
              stock_location_id: loc.id,
              sales_channel_id: defaultSalesChannel[0].id,
            },
            fields: ["id"],
          } as any);
          logger.info(`  Linked ${loc.name} to ${defaultSalesChannel[0].name}`);
        }
      } catch (e: any) {
        logger.info(`  ${loc.name} already linked to ${defaultSalesChannel[0].name}`);
      }
    }
  }

  logger.info("\n✅ Fulfillment setup complete for all locations");
}
