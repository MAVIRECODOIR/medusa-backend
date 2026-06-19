import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function listLocations({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "address.*"],
  });

  console.log(`\nFound ${locations.length} stock locations:\n`);
  for (const loc of locations) {
    console.log(`  ID:   ${loc.id}`);
    console.log(`  Name: ${loc.name}`);
    if (loc.address) {
      console.log(`  Addr: ${loc.address.address_1 || ""}, ${loc.address.city || ""}, ${loc.address.country_code || ""}`);
    }
    console.log();
  }

  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name"],
  });

  console.log(`\nFound ${fulfillmentSets.length} fulfillment sets:\n`);
  for (const fs of fulfillmentSets) {
    console.log(`  ID:   ${fs.id}`);
    console.log(`  Name: ${fs.name}`);
    console.log();
  }
}
