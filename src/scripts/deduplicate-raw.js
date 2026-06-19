const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: all } = await client.query(
      `SELECT id, name FROM stock_location WHERE deleted_at IS NULL ORDER BY name, created_at`
    );

    const groups = {};
    for (const loc of all) {
      if (!groups[loc.name]) groups[loc.name] = [];
      groups[loc.name].push(loc);
    }

    const dupIds = [];
    const keepMap = new Map();
    for (const [name, locs] of Object.entries(groups)) {
      if (locs.length > 1) {
        const keep = locs[0];
        const dups = locs.slice(1);
        dupIds.push(...dups.map((l) => l.id));
        for (const d of dups) keepMap.set(d.id, keep.id);
        console.log(`"${name}": keeping ${keep.id}, removing ${dups.length}`);
      }
    }

    if (dupIds.length === 0) { console.log("No duplicates."); return; }

    // Update fulfillment records
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId);
      const r = await client.query(`UPDATE fulfillment SET location_id = $1::text WHERE location_id = $2::text`, [keepId, dupId]);
      if (r.rowCount > 0) console.log(`  Updated ${r.rowCount} fulfillments`);
    }

    // location_fulfillment_set links
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId);
      const { rows: links } = await client.query(
        `SELECT fulfillment_set_id FROM location_fulfillment_set WHERE stock_location_id = $1::text`, [dupId]
      );
      for (const link of links) {
        const { rows: existing } = await client.query(
          `SELECT 1 FROM location_fulfillment_set WHERE stock_location_id = $1::text AND fulfillment_set_id = $2::text`,
          [keepId, link.fulfillment_set_id]
        );
        if (existing.length === 0) {
          await client.query(
            `INSERT INTO location_fulfillment_set (id, stock_location_id, fulfillment_set_id, created_at, updated_at)
             VALUES ($1, $2::text, $3::text, NOW(), NOW())`,
            [`loc_fset_${dupId}_${Date.now()}`, keepId, link.fulfillment_set_id]
          );
        }
      }
    }

    // location_fulfillment_provider links
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId);
      const { rows: links } = await client.query(
        `SELECT fulfillment_provider_id FROM location_fulfillment_provider WHERE stock_location_id = $1::text`, [dupId]
      );
      for (const link of links) {
        const { rows: existing } = await client.query(
          `SELECT 1 FROM location_fulfillment_provider WHERE stock_location_id = $1::text AND fulfillment_provider_id = $2::text`,
          [keepId, link.fulfillment_provider_id]
        );
        if (existing.length === 0) {
          await client.query(
            `INSERT INTO location_fulfillment_provider (id, stock_location_id, fulfillment_provider_id, created_at, updated_at)
             VALUES ($1, $2::text, $3::text, NOW(), NOW())`,
            [`loc_fprov_${dupId}_${Date.now()}`, keepId, link.fulfillment_provider_id]
          );
        }
      }
    }

    // sales_channel_stock_location links
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId);
      const { rows: links } = await client.query(
        `SELECT sales_channel_id FROM sales_channel_stock_location WHERE stock_location_id = $1::text`, [dupId]
      );
      for (const link of links) {
        const { rows: existing } = await client.query(
          `SELECT 1 FROM sales_channel_stock_location WHERE stock_location_id = $1::text AND sales_channel_id = $2::text`,
          [keepId, link.sales_channel_id]
        );
        if (existing.length === 0) {
          await client.query(
            `INSERT INTO sales_channel_stock_location (id, stock_location_id, sales_channel_id, created_at, updated_at)
             VALUES ($1, $2::text, $3::text, NOW(), NOW())`,
            [`sc_sloc_${dupId}_${Date.now()}`, keepId, link.sales_channel_id]
          );
        }
      }
    }

    // Update store default_location_id
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId);
      await client.query(`UPDATE "store" SET default_location_id = $1::text WHERE default_location_id = $2::text`, [keepId, dupId]);
    }

    // Cleanup link tables
    const d1 = await client.query(`DELETE FROM location_fulfillment_set WHERE stock_location_id = ANY($1::text[])`, [dupIds]);
    const d2 = await client.query(`DELETE FROM location_fulfillment_provider WHERE stock_location_id = ANY($1::text[])`, [dupIds]);
    const d3 = await client.query(`DELETE FROM sales_channel_stock_location WHERE stock_location_id = ANY($1::text[])`, [dupIds]);
    const d4 = await client.query(`DELETE FROM inventory_level WHERE location_id = ANY($1::text[])`, [dupIds]);
    console.log(`Cleaned up ${d1.rowCount + d2.rowCount + d3.rowCount + d4.rowCount} link/inventory rows.`);

    // Delete duplicates
    await client.query(`DELETE FROM stock_location WHERE id = ANY($1::text[])`, [dupIds]);
    console.log(`Deleted ${dupIds.length} duplicates.`);

    // Handle European Warehouse
    const { rows: eu } = await client.query(
      `SELECT id FROM stock_location WHERE name = 'European Warehouse' AND deleted_at IS NULL`
    );
    const { rows: ld } = await client.query(
      `SELECT id FROM stock_location WHERE name = 'Main Warehouse - London' AND deleted_at IS NULL`
    );

    if (eu.length > 0 && ld.length > 0) {
      const euIds = eu.map((r) => r.id);
      for (const euId of euIds) {
        await client.query(`UPDATE "store" SET default_location_id = $1::text WHERE default_location_id = $2::text`, [ld[0].id, euId]);
      }
      await client.query(`DELETE FROM location_fulfillment_set WHERE stock_location_id = ANY($1::text[])`, [euIds]);
      await client.query(`DELETE FROM location_fulfillment_provider WHERE stock_location_id = ANY($1::text[])`, [euIds]);
      await client.query(`DELETE FROM sales_channel_stock_location WHERE stock_location_id = ANY($1::text[])`, [euIds]);
      await client.query(`DELETE FROM inventory_level WHERE location_id = ANY($1::text[])`, [euIds]);
      await client.query(`DELETE FROM stock_location WHERE id = ANY($1::text[])`, [euIds]);
      console.log(`Deleted ${euIds.length} European Warehouse (London already exists).`);
    } else if (eu.length > 0) {
      await client.query(`UPDATE stock_location SET name = 'Main Warehouse - London' WHERE name = 'European Warehouse'`);
      console.log(`Renamed European Warehouse → Main Warehouse - London.`);
    }

    const { rows: remaining } = await client.query(`SELECT id, name FROM stock_location WHERE deleted_at IS NULL ORDER BY name`);
    console.log(`\n=== Done. ${remaining.length} locations ===`);
    for (const loc of remaining) console.log(`  ${loc.name} (${loc.id})`);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
