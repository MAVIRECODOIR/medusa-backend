import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function testShippo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const shippoService = container.resolve("shippo") as any;

  logger.info("Testing Shippo integration...");

  try {
    // Test 1: Get account address
    logger.info("Test 1: Getting account address...");
    const accountAddress = await shippoService.getAccountAddress();
    logger.info(`✅ Account address retrieved: ${JSON.stringify(accountAddress, null, 2)}`);

    // Test 2: List carriers
    logger.info("\nTest 2: Listing available carriers...");
    const carriers = await shippoService.listCarriers();
    logger.info(`✅ Found ${carriers.length} carriers:`);
    carriers.forEach((carrier: any) => {
      logger.info(`  - ${carrier.provider} (${carrier.carrierId})`);
    });

    // Test 3: Create a test address
    logger.info("\nTest 3: Creating test address...");
    const testAddress = await shippoService.createAddress({
      name: "Test Customer",
      street1: "123 Test Street",
      city: "London",
      state: "Greater London",
      zip: "EC1A 1BB",
      country: "GB",
      phone: "+44 20 7123 4567",
      email: "test@example.com",
    });
    logger.info(`✅ Test address created: ${JSON.stringify(testAddress, null, 2)}`);

    // Test 4: Get rates for a test shipment (simplified parcel)
    logger.info("\nTest 4: Getting rates for test shipment...");
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
    rates.forEach((rate: any) => {
      logger.info(`  - ${rate.provider} ${rate.servicelevel_name}: ${rate.amount} ${rate.currency} (${rate.estimated_days} days)`);
    });

    logger.info("\n✅ All Shippo tests passed!");
  } catch (error: any) {
    logger.error(`❌ Shippo test failed: ${error.message}`);
    throw error;
  }
}
