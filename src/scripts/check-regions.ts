export default async function checkRegions({ container }) {
  const query = container.resolve("query")
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2", "countries.iso_3", "countries.name", "countries.display_name"],
  })
  for (const r of regions) {
    console.log(`\nRegion: ${r.name} (${r.currency_code}) [${r.id}]`)
    console.log(`  Countries:`)
    for (const c of r.countries || []) {
      console.log(`    ${c.iso_2} - ${c.display_name || c.name}`)
    }
    if (!r.countries?.length) {
      console.log(`    (none)`)
    }
  }
}
