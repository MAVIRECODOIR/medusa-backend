const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Find and delete orphan fulfillment_set link (fuset no longer exists)
    const { rows: orphans } = await client.query(`
      SELECT lfs.id
      FROM location_fulfillment_set lfs
      LEFT JOIN fulfillment_set fs ON fs.id = lfs.fulfillment_set_id
      WHERE lfs.deleted_at IS NULL AND fs.id IS NULL
    `);
    console.log(`Orphan links: ${orphans.length}`);
    for (const o of orphans) {
      await client.query(`DELETE FROM location_fulfillment_set WHERE id = $1`, [o.id]);
      console.log(`  Deleted orphan link: ${o.id}`);
    }

    // Verify shipping options exist for each zone
    const { rows: zones } = await client.query(`
      SELECT sz.id, sz.name, fs.name AS set_name
      FROM service_zone sz
      JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
      WHERE sz.deleted_at IS NULL AND fs.deleted_at IS NULL
    `);
    console.log(`\nService zones: ${zones.length}`);
    for (const z of zones) {
      const { rows: opts } = await client.query(`
        SELECT id, name FROM shipping_option WHERE service_zone_id = $1 AND deleted_at IS NULL
      `, [z.id]);
      console.log(`  ${z.set_name} / ${z.name}: ${opts.length} shipping options`);
      for (const o of opts) console.log(`    - ${o.name} (${o.id})`);
    }
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
