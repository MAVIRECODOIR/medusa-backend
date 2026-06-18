import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function fixStockLocations({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const stockModule = container.resolve(Modules.STOCK_LOCATION);

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "address.address_1", "address.city", "address.province", "address.country_code", "address.postal_code"],
  });

  let fixed = 0;
  for (const loc of locations) {
    const updates: Record<string, any> = {};

    if (!loc.address) {
      logger.warn(`  ${loc.name} (${loc.id}): has no address at all, skipping`);
      continue;
    }

    let province = loc.address.province;
    let postalCode = loc.address.postal_code;
    const address1 = loc.address.address_1;
    const city = loc.address.city;
    const country = loc.address.country_code?.toLowerCase();

    if (!province) {
      if (country === "gb") province = "Greater London";
      else if (country === "us") province = "NY";
      else if (country === "de") province = "Berlin";
      else if (country === "fr") province = "Paris";
      else province = "N/A";
    }

    if (!postalCode) {
      if (country === "gb") postalCode = "EC1A 1BB";
      else if (country === "us") postalCode = "10001";
      else if (country === "de") postalCode = "10115";
      else if (country === "fr") postalCode = "75001";
      else postalCode = "00000";
    }

    if (!address1) updates["address.address_1"] = "1 Main Street";
    if (!city) updates["address.city"] = country === "gb" ? "London" : country === "us" ? "New York" : city || "Unknown";

    if (province !== loc.address.province || postalCode !== loc.address.postal_code) {
      await stockModule.updateStockLocations(loc.id, {
        address: {
          ...(loc.address.address_1 && { address_1: loc.address.address_1 }),
          ...(loc.address.city && { city: loc.address.city }),
          country_code: country || "GB",
          province,
          postal_code: postalCode,
        },
      });
      logger.info(`  Fixed ${loc.name}: province=${province}, postal_code=${postalCode}`);
      fixed++;
    } else {
      logger.info(`  OK ${loc.name}: province=${loc.address.province}, postal_code=${loc.address.postal_code}`);
    }
  }

  logger.info(`Fixed ${fixed} stock location(s)`);
}
