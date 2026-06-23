import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function checkRegions({ container }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("Checking region configuration...");

  // Get all regions with countries
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries"],
  });

  logger.info(`Found ${regions.length} regions:`);
  
  for (const region of regions) {
    logger.info(`\nRegion: ${region.name}`);
    logger.info(`  Currency: ${region.currency_code}`);
    logger.info(`  Countries: ${region.countries?.map((c: any) => c.iso_2).join(", ") || "None"}`);
  }

  // Check if UK region exists and has GB country
  const ukRegion = regions.find((r) => r.currency_code === "gbp");
  
  if (!ukRegion) {
    logger.error("❌ UK region with GBP not found!");
    return;
  }

  if (!ukRegion.countries || ukRegion.countries.length === 0) {
    logger.error("❌ UK region has no countries configured!");
    logger.info("Adding GB country to UK region...");
    
    await query.graph({
      entity: "region",
      data: {
        id: ukRegion.id,
        countries: ["gb"],
      },
    });
    logger.info("✓ GB country added to UK region");
  } else {
    const hasGB = ukRegion.countries.some((c: any) => c.iso_2 === "gb");
    if (hasGB) {
      logger.info("✓ UK region correctly configured with GB country");
    } else {
      logger.error("❌ UK region exists but doesn't have GB country!");
      logger.info("Current countries:", ukRegion.countries.map((c: any) => c.iso_2).join(", "));
    }
  }

  // Check store default region
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_region_id"],
  });

  if (stores.length > 0) {
    const store = stores[0];
    logger.info(`\nStore: ${store.name}`);
    logger.info(`Default region ID: ${store.default_region_id}`);
    
    if (store.default_region_id === ukRegion.id) {
      logger.info("✓ Store default region is correctly set to UK region");
    } else {
      logger.warn("⚠ Store default region is not UK region");
    }
  }
}
