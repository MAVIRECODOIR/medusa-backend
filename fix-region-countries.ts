import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function fixRegionCountries({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const regionModuleService = container.resolve(Modules.REGION);

  logger.info("Fixing region countries using region module service...");

  // Define region country mappings (no duplicates across regions)
  const regionCountryMap = {
    "United Kingdom": ["gb"],
    "United States": ["us"],
    "Europe": ["at", "be", "bg", "hr", "cy", "cz", "dk", "ee", "fi", "fr", "de", "gr", "hu", "ie", "it", "lv", "lt", "lu", "mt", "nl", "pl", "pt", "ro", "sk", "si", "es", "se"],
    "North America": ["ca"], // Removed us (already in US region) and mx (will be in Rest of World)
    "Rest of World": ["au", "nz", "jp", "sg", "hk", "ae", "za", "br", "ar", "cl", "co", "pe", "in", "kr", "tw", "th", "my", "id", "ph", "vn", "mx"]
  };

  // Get all regions
  const regions = await regionModuleService.listRegions();

  logger.info(`Found ${regions.length} regions`);

  for (const region of regions) {
    const countries = regionCountryMap[region.name];
    
    if (!countries) {
      logger.warn(`⚠ No country mapping found for region: ${region.name}`);
      continue;
    }

    logger.info(`Updating region: ${region.name} (${region.currency_code})`);
    logger.info(`  Setting countries: ${countries.join(", ")}`);

    try {
      await regionModuleService.updateRegions(region.id, {
        countries: countries,
      });
      logger.info(`✓ ${region.name} updated with ${countries.length} countries`);
    } catch (error) {
      logger.error(`❌ Failed to update ${region.name}:`, error);
    }
  }

  logger.info("\nRegion country fix completed!");
  
  // Verify the setup
  logger.info("\nVerifying region configuration...");
  const updatedRegions = await regionModuleService.listRegions();

  for (const region of updatedRegions) {
    // Fetch each region with countries separately
    const regionWithCountries = await regionModuleService.retrieveRegion(region.id, {
      relations: ["countries"]
    });
    logger.info(`\n${regionWithCountries.name} (${regionWithCountries.currency_code}):`);
    logger.info(`  Countries: ${regionWithCountries.countries?.map((c: any) => c.iso_2).join(", ") || "None"}`);
  }
}
