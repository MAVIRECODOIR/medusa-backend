const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // All fulfillment sets
    const { rows: sets } = await client.query(`
      SELECT id, name, type FROM fulfillment_set WHERE deleted_at IS NULL
    `);
    console.log("=== FULFILLMENT SETS ===");
    for (const s of sets) {
      console.log(`  ${s.name} (${s.id}) - type: ${s.type}`);
      // service zones for each
      const { rows: zones } = await client.query(`
        SELECT id, name FROM service_zone WHERE fulfillment_set_id = $1 AND deleted_at IS NULL
      `, [s.id]);
      for (const z of zones) {
        const { rows: geo } = await client.query(`
          SELECT country_code, type FROM geo_zone WHERE service_zone_id = $1 AND deleted_at IS NULL
        `, [z.id]);
        console.log(`    Zone: ${z.name} (${z.id})`);
        for (const g of geo) console.log(`      ${g.country_code} - ${g.type}`);
      }
    }

    // Location-fulfillment set links
    const { rows: lfs } = await client.query(`
      SELECT * FROM location_fulfillment_set WHERE deleted_at IS NULL
    `);
    console.log("\n=== LOCATION FULFILLMENT SET LINKS ===");
    for (const row of lfs) {
      const { rows: [loc] } = await client.query(`SELECT name FROM stock_location WHERE id = $1`, [row.stock_location_id]);
      const { rows: [fset] } = await client.query(`SELECT name FROM fulfillment_set WHERE id = $1`, [row.fulfillment_set_id]);
      console.log(`  ${loc?.name || row.stock_location_id} <-> ${fset?.name || row.fulfillment_set_id}`);
    }

    // Location-fulfillment provider links
    const { rows: lfp } = await client.query(`
      SELECT * FROM location_fulfillment_provider WHERE deleted_at IS NULL
    `);
    console.log("\n=== LOCATION FULFILLMENT PROVIDER LINKS ===");
    for (const row of lfp) {
      const { rows: [loc] } = await client.query(`SELECT name FROM stock_location WHERE id = $1`, [row.stock_location_id]);
      console.log(`  ${loc?.name || row.stock_location_id} -> ${row.fulfillment_provider_id}`);
    }

    // Sales channel stock location links
    const { rows: scsl } = await client.query(`
      SELECT * FROM sales_channel_stock_location WHERE deleted_at IS NULL
    `);
    console.log("\n=== SALES CHANNEL STOCK LOCATION LINKS ===");
    for (const row of scsl) {
      const { rows: [loc] } = await client.query(`SELECT name FROM stock_location WHERE id = $1`, [row.stock_location_id]);
      const { rows: [sc] } = await client.query(`SELECT name FROM sales_channel WHERE id = $1`, [row.sales_channel_id]);
      console.log(`  ${loc?.name || row.stock_location_id} <-> ${sc?.name || row.sales_channel_id}`);
    }

  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
