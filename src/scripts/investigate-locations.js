const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Check stock_location table
    const { rows: locs } = await client.query(`
      SELECT id, name, address_id, created_at, updated_at, deleted_at
      FROM stock_location
      WHERE deleted_at IS NULL
      ORDER BY created_at
    `);
    console.log("=== STOCK LOCATIONS ===");
    for (const loc of locs) {
      console.log(`\n${loc.name}`);
      console.log(`  id: ${loc.id}`);
      console.log(`  address_id: ${loc.address_id}`);
      console.log(`  created_at: ${loc.created_at}`);
    }

    // Check stock_location_address table
    const { rows: addrs } = await client.query(`
      SELECT * FROM stock_location_address WHERE deleted_at IS NULL
    `);
    console.log("\n=== STOCK LOCATION ADDRESSES ===");
    if (addrs.length === 0) {
      console.log("(none found)");
    }
    for (const a of addrs) {
      console.log(a);
    }

    // Check if London has an address
    const london = locs.find(l => l.name.includes("London"));
    if (london && london.address_id) {
      const { rows: addr } = await client.query(`
        SELECT * FROM stock_location_address WHERE id = $1 AND deleted_at IS NULL
      `, [london.address_id]);
      console.log("\n=== LONDON ADDRESS ===");
      console.log(addr[0] || "not found in address table");
    } else if (london) {
      console.log(`\n=== LONDON HAS NO address_id ===`);
    }

    // Check fulfillment provider links
    const { rows: lfp } = await client.query(`
      SELECT * FROM location_fulfillment_provider WHERE deleted_at IS NULL
    `);
    console.log("\n=== LOCATION FULFILLMENT PROVIDER LINKS ===");
    if (lfp.length === 0) console.log("(none)");
    for (const row of lfp) console.log(row);

    // Check service zones
    const { rows: fs } = await client.query(`SELECT id, name FROM fulfillment_set WHERE deleted_at IS NULL`);
    console.log("\n=== FULFILLMENT SETS ===");
    for (const f of fs) {
      console.log(`\nSet: ${f.name} (${f.id})`);
      const { rows: zones } = await client.query(`
        SELECT id, name, metadata FROM service_zone WHERE fulfillment_set_id = $1 AND deleted_at IS NULL
      `, [f.id]);
      for (const z of zones) {
        console.log(`  Zone: ${z.name} (${z.id})`);
        const { rows: geo } = await client.query(`
          SELECT * FROM geo_zone WHERE service_zone_id = $1 AND deleted_at IS NULL
        `, [z.id]);
        for (const g of geo) console.log(`    ${g.country_code} - ${g.type}`);
      }
    }

  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
