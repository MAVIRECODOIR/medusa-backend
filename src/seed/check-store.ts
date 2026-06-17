import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function checkStore({ container }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  console.log("🔍 Checking current store configuration...");

  // Check store
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "default_region_id", "default_sales_channel_id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  });

  console.log("\n📦 Store Configuration:");
  if (stores.length > 0) {
    const store = stores[0];
    const defaultCurrency = (store as any).supported_currencies?.find((c: any) => c.is_default);
    console.log(`- ID: ${store.id}`);
    console.log(`- Name: ${store.name}`);
    console.log(`- Default Currency: ${defaultCurrency?.currency_code || "none"} ${defaultCurrency ? "(from supported_currencies)" : ""}`);
    console.log(`- Default Region ID: ${store.default_region_id}`);
    console.log(`- Default Sales Channel ID: ${store.default_sales_channel_id}`);
    console.log(`- All Supported Currencies:`);
    for (const c of (store as any).supported_currencies || []) {
      console.log(`    ${c.currency_code}${c.is_default ? " (default)" : ""}`);
    }
  } else {
    console.log("❌ No store found!");
  }

  // Check regions
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  });

  console.log("\n🌍 Regions:");
  regions.forEach((r) => {
    console.log(`- ${r.name} (${r.currency_code}): ${r.id}`);
  });

  // Check sales channels
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_active"],
  });

  console.log("\n📦 Sales Channels:");
  salesChannels.forEach((sc) => {
    console.log(`- ${sc.name} (${sc.id}): ${sc.is_active ? 'Active' : 'Inactive'}`);
  });

  console.log("\n✅ Store check completed");
}
