export default async function checkCart({ container }) {
  const query = container.resolve("query")
  // Check the failed cart
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "region_id",
      "region.name",
      "region.currency_code",
      "region.countries.iso_2",
      "shipping_address.address_1",
      "shipping_address.country_code",
      "shipping_address.city",
      "shipping_address.province",
      "shipping_address.postal_code",
    ],
    filters: { id: "cart_01KVESFC4WXK2YPV3Q1RSGNFCK" },
  })
  if (carts?.length) {
    const c = carts[0]
    console.log("Cart:", c.id)
    console.log("Region ID:", c.region_id)
    console.log("Region name:", c.region?.name)
    console.log("Region currency:", c.region?.currency_code)
    console.log("Region countries:", c.region?.countries?.map(c => c.iso_2).join(", "))
    console.log("Shipping country:", c.shipping_address?.country_code)
  } else {
    console.log("Cart not found (may have been deleted or is from a different env)")
  }

  // Also check all regions and their country codes format
  console.log("\n--- All regions with country formats ---")
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "countries.iso_3"],
  })
  for (const r of regions) {
    for (const c of r.countries || []) {
      // Check if country code formatting is consistent
      console.log(`${r.name}: ${c.iso_2} (iso2) / ${c.iso_3} (iso3) — lower: ${c.iso_2?.toLowerCase()}`)
    }
  }
}
