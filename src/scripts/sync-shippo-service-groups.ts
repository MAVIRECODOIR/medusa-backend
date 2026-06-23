import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

// Mapping of Medusa shipping options to Shippo service groups
const SHIPPING_OPTION_MAPPING = {
  "UK Zone": [
    {
      name: "Complimentary Standard Delivery",
      code: "standard-uk",
      description: "Complimentary standard delivery within UK",
      prices: [{ currency_code: "gbp", amount: 0 }],
      // Will map to economy carriers like Royal Mail Tracked 48, Hermes Standard
      carrier_tokens: [], // Will be populated from available carriers
    },
    {
      name: "Express Delivery",
      code: "express-uk",
      description: "Express delivery within UK",
      prices: [{ currency_code: "gbp", amount: 800 }],
      // Will map to express carriers like Royal Mail Tracked 24, DPD Next Day
      carrier_tokens: [],
    },
  ],
  "Europe Zone": [
    {
      name: "International Standard Delivery",
      code: "international-standard-europe",
      description: "International standard delivery to Europe",
      prices: [{ currency_code: "gbp", amount: 1200 }, { currency_code: "eur", amount: 1500 }],
      carrier_tokens: [],
    },
    {
      name: "International Express Delivery",
      code: "international-express-europe",
      description: "International express delivery to Europe",
      prices: [{ currency_code: "gbp", amount: 2000 }, { currency_code: "eur", amount: 2500 }],
      carrier_tokens: [],
    },
  ],
  "North America Zone": [
    {
      name: "International Standard Delivery",
      code: "international-standard-north-america",
      description: "International standard delivery to North America",
      prices: [{ currency_code: "gbp", amount: 1800 }, { currency_code: "usd", amount: 2500 }],
      carrier_tokens: [],
    },
    {
      name: "International Express Delivery",
      code: "international-express-north-america",
      description: "International express delivery to North America",
      prices: [{ currency_code: "gbp", amount: 3000 }, { currency_code: "usd", amount: 4000 }],
      carrier_tokens: [],
    },
  ],
  "Rest of World Zone": [
    {
      name: "International Standard Delivery",
      code: "international-standard-rest-of-world",
      description: "International standard delivery to Rest of World",
      prices: [{ currency_code: "gbp", amount: 2500 }, { currency_code: "usd", amount: 3500 }],
      carrier_tokens: [],
    },
    {
      name: "International Express Delivery",
      code: "international-express-rest-of-world",
      description: "International express delivery to Rest of World",
      prices: [{ currency_code: "gbp", amount: 4000 }, { currency_code: "usd", amount: 5500 }],
      carrier_tokens: [],
    },
  ],
};

export default async function syncShippoServiceGroups({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const shippoService = container.resolve("shippo") as any;

  logger.info("Syncing Medusa shipping options to Shippo Service Groups...");

  try {
    // Step 1: List existing service groups
    logger.info("\nStep 1: Listing existing Shippo service groups...");
    const existingGroups = await shippoService.shippoClient.serviceGroups.list({});
    logger.info(`Found ${existingGroups.results?.length || 0} existing service groups`);

    // Step 2: Get available service levels by creating a test shipment
    logger.info("\nStep 2: Getting available carrier service levels...");
    
    const testShipment = await shippoService.shippoClient.shipments.create({
      addressFrom: {
        name: "Mavire Codoir",
        street1: "1 London Bridge",
        city: "London",
        state: "Greater London",
        zip: "EC1A 1BB",
        country: "GB",
        phone: "+44 20 7123 4567",
      },
      addressTo: {
        name: "Test Customer",
        street1: "123 Test Street",
        city: "Manchester",
        state: "Greater Manchester",
        zip: "M1 1AA",
        country: "GB",
        phone: "+44 161 234 5678",
      },
      parcels: [
        {
          length: "10",
          width: "10",
          height: "5",
          distanceUnit: "cm",
          weight: "0.5",
          massUnit: "kg",
        },
      ],
      async: false,
    });

    logger.info(`Found ${testShipment.rates?.length || 0} available service levels:`);
    const serviceLevelMap = new Map();
    
    testShipment.rates?.forEach((rate: any) => {
      logger.info(`  - ${rate.provider}: ${rate.servicelevel?.name} (token: ${rate.servicelevel?.token})`);
      // Store full service level object
      serviceLevelMap.set(rate.servicelevel?.name, {
        token: rate.servicelevel?.token,
        name: rate.servicelevel?.name,
      });
    });

    // Step 3: Create service groups for each shipping option
    logger.info("\nStep 3: Creating service groups for Medusa shipping options...");
    
    for (const [zone, options] of Object.entries(SHIPPING_OPTION_MAPPING)) {
      logger.info(`\nProcessing zone: ${zone}`);
      
      for (const option of options) {
        logger.info(`  Creating service group: ${option.name} (${option.code})`);
        
        try {
          // Check if service group already exists
          const existingGroup = existingGroups.results?.find(
            (g: any) => g.name === option.name || g.name === option.code
          );

          if (existingGroup) {
            logger.info(`    ✅ Service group already exists: ${existingGroup.objectId}`);
            continue;
          }

          // Map service levels based on option type
          let serviceLevels: any[] = [];
          let type: "LIVE_RATE" | "FLAT_RATE" | "FREE_SHIPPING" = "LIVE_RATE";
          let flatRate: string | undefined;
          let flatRateCurrency: string | undefined;
          let freeShippingThresholdMin: string | undefined;
          let freeShippingThresholdCurrency: string | undefined;

          if (option.name.includes("Complimentary") || option.name.includes("Free")) {
            type = "FREE_SHIPPING";
            // For free shipping, set a high threshold (effectively always free)
            freeShippingThresholdMin = "999999";
            freeShippingThresholdCurrency = "GBP";
            // Use economy service levels
            serviceLevels = Array.from(serviceLevelMap.values())
              .filter((sl: any) => sl.token && sl.token.toLowerCase().includes("standard"))
              .map((sl: any) => ({ token: sl.token }));
          } else if (option.prices && option.prices.length > 0) {
            // Use FLAT_RATE for options with fixed prices
            type = "FLAT_RATE";
            flatRate = String(option.prices[0].amount / 100); // Convert from cents to base units and to string
            flatRateCurrency = option.prices[0].currency_code.toUpperCase();
            // Still include service levels for carrier selection
            serviceLevels = Array.from(serviceLevelMap.values())
              .filter((sl: any) => sl.token)
              .map((sl: any) => ({ token: sl.token }));
          } else {
            type = "LIVE_RATE";
            // For standard, use all available service levels
            serviceLevels = Array.from(serviceLevelMap.values())
              .filter((sl: any) => sl.token)
              .map((sl: any) => ({ token: sl.token }));
          }

          if (serviceLevels.length === 0) {
            logger.warn(`    ⚠️ No matching service levels found, using all available`);
            serviceLevels = Array.from(serviceLevelMap.values())
              .filter((sl: any) => sl.token)
              .map((sl: any) => ({ token: sl.token }));
          }

          // Build service group payload with required fields
          const payload: any = {
            name: option.name,
            description: option.description,
            type: type,
            serviceLevels: serviceLevels,
          };

          // Add type-specific required fields
          if (type === "FLAT_RATE") {
            payload.flatRate = flatRate;
            payload.flatRateCurrency = flatRateCurrency;
          } else if (type === "FREE_SHIPPING") {
            payload.freeShippingThresholdMin = freeShippingThresholdMin;
            payload.freeShippingThresholdCurrency = freeShippingThresholdCurrency;
          }

          // Create service group with required fields
          const serviceGroup = await shippoService.shippoClient.serviceGroups.create(payload);

          logger.info(`    ✅ Created service group: ${serviceGroup.objectId}`);
          logger.info(`       Type: ${type}, Service levels: ${serviceLevels.length}`);
        } catch (error: any) {
          logger.error(`    ❌ Failed to create service group: ${error.message}`);
          if (error.cause) {
            logger.error(`       Details: ${JSON.stringify(error.cause, null, 2)}`);
          }
        }
      }
    }

    logger.info("\n✅ Service group sync complete!");
    logger.info("\nNext steps:");
    logger.info("1. Review created service groups in Shippo dashboard > Settings > Service Groups");
    logger.info("2. Adjust service level mappings if needed");
    logger.info("3. Use service group tokens in your shipping workflow for rate calculation");

  } catch (error: any) {
    logger.error(`❌ Service group sync failed: ${error.message}`);
    if (error.cause) {
      logger.error(`Cause: ${JSON.stringify(error.cause, null, 2)}`);
    }
    throw error;
  }
}
