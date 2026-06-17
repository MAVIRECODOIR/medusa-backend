import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function currencySetup({ container }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // Check if GBP currency exists
  const { data: currencies } = await query.graph({
    entity: "currency",
    fields: ["code", "symbol", "name"],
    filters: {
      code: "gbp",
    },
  });

  if (currencies.length === 0) {
    // Create GBP currency
    await query.graph({
      entity: "currency",
      data: {
        code: "gbp",
        symbol: "£",
        name: "British Pound",
      },
    });
    console.log("✓ GBP currency created");
  } else {
    console.log("✓ GBP currency already exists");
  }

  // Create default sales channel
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: {
      name: "Default Store",
    },
  });

  if (salesChannels.length === 0) {
    await query.graph({
      entity: "sales_channel",
      data: {
        name: "Default Store",
        description: "Main sales channel for MAVIRE",
        is_active: true,
      },
    });
    console.log("✓ Default sales channel created");
  } else {
    console.log("✓ Default sales channel already exists");
  }
}
