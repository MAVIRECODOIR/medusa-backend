import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function testShippoLabel({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const shippoService = container.resolve("shippo") as any;

  logger.info("Testing Shippo label creation...");

  try {
    // Step 1: Get rates for a test shipment
    logger.info("Step 1: Getting rates for test shipment...");
    const rates = await shippoService.getRates({
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
    });

    logger.info(`✅ Found ${rates.length} rates:`);
    rates.forEach((rate: any, index: number) => {
      logger.info(`  ${index + 1}. ${rate.provider} ${rate.servicelevel_name}: ${rate.amount} ${rate.currency}`);
    });

    if (rates.length === 0) {
      logger.error("❌ No rates available for label creation");
      return;
    }

    // Step 2: Create a label using the first rate
    logger.info("\nStep 2: Creating label with the first rate...");
    const firstRate = rates[0];
    logger.info(`Using: ${firstRate.provider} ${firstRate.servicelevel_name} (${firstRate.amount} ${firstRate.currency})`);

    // Note: In a real scenario, you would use the rate object ID from Shippo
    // For now, we'll need to get the shipment first to get the rate object ID
    const shipment = await shippoService.getRates({
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

    // Get the full shipment response to access rate object IDs
    logger.info("Creating full shipment to get rate object IDs...");
    const fullShipment = await shippoService.shippoClient.shipments.create({
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

    logger.info(`Shipment created with ID: ${fullShipment.objectId}`);
    logger.info(`Available rates in shipment: ${fullShipment.rates?.length || 0}`);

    if (fullShipment.rates && fullShipment.rates.length > 0) {
      const rateObjectId = fullShipment.rates[0].objectId;
      logger.info(`Using rate object ID: ${rateObjectId}`);

      // Step 3: Create the label
      logger.info("\nStep 3: Creating shipping label...");
      const label = await shippoService.createLabel(rateObjectId);

      logger.info("✅ Label created successfully:");
      logger.info(`  - Label URL: ${label.label_url}`);
      logger.info(`  - Tracking Number: ${label.tracking_number}`);
      logger.info(`  - Tracking URL: ${label.tracking_url_provider}`);
      logger.info(`  - ETA: ${label.eta}`);

      logger.info("\n✅ All Shippo label tests passed!");
    } else {
      logger.error("❌ No rates found in shipment response");
    }
  } catch (error: any) {
    logger.error(`❌ Shippo label test failed: ${error.message}`);
    if (error.cause) {
      logger.error(`Cause: ${JSON.stringify(error.cause, null, 2)}`);
    }
    throw error;
  }
}
