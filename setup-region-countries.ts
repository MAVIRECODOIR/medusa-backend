import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function setupRegionCountries({ container }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("Setting up region countries...");

  // Define region country mappings
  const regionCountryMap = {
    "United Kingdom": ["gb"],
    "United States": ["us"],
    "Europe": ["at", "be", "bg", "hr", "cy", "cz", "dk", "ee", "fi", "fr", "de", "gr", "hu", "ie", "it", "lv", "lt", "lu", "mt", "nl", "pl", "pt", "ro", "sk", "si", "es", "se"],
    "North America": ["us", "ca", "mx"],
    "Rest of World": ["au", "nz", "jp", "sg", "hk", "ae", "za", "br", "ar", "cl", "co", "pe", "in", "kr", "tw", "th", "my", "id", "ph", "vn"]
  };

  // Get all regions
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries"],
  });

  for (const region of regions) {
    const countries = regionCountryMap[region.name];
    
    if (!countries) {
      logger.warn(`⚠ No country mapping found for region: ${region.name}`);
      continue;
    }

    logger.info(`Updating region: ${region.name}`);
    logger.info(`  Setting countries: ${countries.join(", ")}`);

    try {
      await query.graph({
        entity: "region",
        data: {
          id: region.id,
          countries: countries,
        },
      });
      logger.info(`✓ ${region.name} updated with ${countries.length} countries`);
    } catch (error) {
      logger.error(`❌ Failed to update ${region.name}:`, error);
    }
  }

  logger.info("\nRegion country setup completed!");
  
  // Verify the setup
  logger.info("\nVerifying region configuration...");
  const { data: updatedRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries"],
  });

  for (const region of updatedRegions) {
    logger.info(`\n${region.name} (${region.currency_code}):`);
    logger.info(`  Countries: ${region.countries?.map((c: any) => c.iso_2).join(", ") || "None"}`);
  }
}
