const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Check if EUR warehouse already exists
    const { rows: existing } = await client.query(
      `SELECT id FROM stock_location WHERE name LIKE '%EUR%' OR name LIKE '%European%' OR name LIKE '%Amsterdam%' AND deleted_at IS NULL`
    );

    if (existing.length > 0) {
      console.log("EUR warehouse already exists:", existing[0].id);
      return;
    }

    // Create the EUR stock location
    await client.query(`
      INSERT INTO stock_location (id, created_at, updated_at, name, address_id)
      VALUES ($1, NOW(), NOW(), $2, $3)
    `, [
      'sloc_eur_amsterdam',
      'European Warehouse - Amsterdam',
      null
    ]);
    console.log("Created stock location: European Warehouse - Amsterdam");

    // Link to the fulfillment set
    const { rows: fset } = await client.query(
      `SELECT id FROM fulfillment_set WHERE name = 'MAVIRE Global Shipping' AND deleted_at IS NULL`
    );
    if (fset.length > 0) {
      await client.query(`
        INSERT INTO location_fulfillment_set (id, stock_location_id, fulfillment_set_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [
        `loc_fset_eur_${Date.now()}`,
        'sloc_eur_amsterdam',
        fset[0].id
      ]);
      console.log("Linked EUR warehouse to fulfillment set");
    }

    // Link to sales channels
    const { rows: channels } = await client.query(
      `SELECT id FROM sales_channel WHERE deleted_at IS NULL`
    );
    for (const ch of channels) {
      // Check if link already exists
      const { rows: existingLink } = await client.query(
        `SELECT 1 FROM sales_channel_stock_location WHERE sales_channel_id = $1 AND stock_location_id = $2`,
        [ch.id, 'sloc_eur_amsterdam']
      );
      if (existingLink.length === 0) {
        await client.query(`
          INSERT INTO sales_channel_stock_location (id, sales_channel_id, stock_location_id, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [
          `scloc_eur_${Date.now()}`,
          ch.id,
          'sloc_eur_amsterdam'
        ]);
        console.log(`Linked EUR warehouse to sales channel: ${ch.id}`);
      }
    }

    // Link to fulfillment provider
    const { rows: providers } = await client.query(
      `SELECT id FROM fulfillment_provider WHERE deleted_at IS NULL`
    );
    for (const p of providers) {
      const { rows: existingLink } = await client.query(
        `SELECT 1 FROM location_fulfillment_provider WHERE stock_location_id = $1 AND fulfillment_provider_id = $2`,
        ['sloc_eur_amsterdam', p.id]
      );
      if (existingLink.length === 0) {
        await client.query(`
          INSERT INTO location_fulfillment_provider (id, stock_location_id, fulfillment_provider_id, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [
          `loc_fprov_eur_${Date.now()}`,
          'sloc_eur_amsterdam',
          p.id
        ]);
        console.log(`Linked EUR warehouse to provider: ${p.id}`);
      }
    }

    console.log("\n✓ EUR warehouse setup complete");
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
