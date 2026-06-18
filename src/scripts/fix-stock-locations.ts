import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function fixStockLocations({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const stockModule = container.resolve(Modules.STOCK_LOCATION);

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "address.id", "address.address_1", "address.city", "address.province", "address.country_code", "address.postal_code"],
  });

  let fixed = 0;
  for (const loc of locations) {
    if (!loc.address || !loc.address.id) {
      logger.warn(`  ${loc.name} (${loc.id}): no address, skipping`);
      continue;
    }

    const addr = loc.address;
    const country = addr.country_code?.toLowerCase() || "gb";

    const province = addr.province || (
      country === "gb" ? "Greater London" :
      country === "us" ? "NY" :
      country === "dk" ? "Copenhagen" :
      country === "de" ? "Berlin" :
      country === "fr" ? "Paris" :
      "N/A"
    );

    const postalCode = addr.postal_code || (
      country === "gb" ? "EC1A 1BB" :
      country === "us" ? "10001" :
      country === "dk" ? "1050" :
      country === "de" ? "10115" :
      country === "fr" ? "75001" :
      "00000"
    );

    const address1 = addr.address_1 || "1 Main Street";
    const city = addr.city || (
      country === "gb" ? "London" :
      country === "us" ? "New York" :
      country === "dk" ? "Copenhagen" :
      "Unknown"
    );

    if (province !== addr.province || postalCode !== addr.postal_code || address1 !== addr.address_1 || city !== addr.city) {
      await stockModule.updateStockLocations(loc.id, {
        address: {
          address_1: address1,
          city,
          country_code: country,
          province,
          postal_code: postalCode,
        },
      });
      logger.info(`  Fixed ${loc.name}: address_1=${address1}, city=${city}, province=${province}, postal_code=${postalCode}`);
      fixed++;
    } else {
      logger.info(`  OK ${loc.name}`);
    }
  }

  logger.info(`Fixed ${fixed} stock location(s)`);
}
