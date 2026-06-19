const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Show current shipping option types
    const { rows: opts } = await client.query(`
      SELECT so.id, so.name, so.service_zone_id, sot.label, sot.code
      FROM shipping_option so
      LEFT JOIN shipping_option_type sot ON sot.id = so.shipping_option_type_id
      WHERE so.deleted_at IS NULL
      ORDER BY so.name
    `);
    console.log("=== SHIPPING OPTIONS BEFORE ===");
    for (const o of opts) console.log(`  ${o.name} | ${o.label} (${o.code}) | zone: ${o.service_zone_id}`);

    // Get zone names for mapping
    const { rows: zones } = await client.query(`
      SELECT sz.id, sz.name, fs.name AS set_name
      FROM service_zone sz
      JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
      WHERE sz.deleted_at IS NULL AND fs.deleted_at IS NULL
    `);
    const zoneMap = Object.fromEntries(zones.map(z => [z.id, z.name.replace(" Zone", "")]));

    // Update each option with unique name + type
    for (const o of opts) {
      const prefix = zoneMap[o.service_zone_id];
      if (!prefix) continue;

      // Update shipping_option name
      const newName = `${prefix} ${o.name.includes("Express") ? "Express" : "Standard"}`;
      await client.query(`UPDATE shipping_option SET name = $1 WHERE id = $2`, [newName, o.id]);

      // Update shipping_option_type label and code
      const newLabel = `${prefix} ${o.label}`;
      const newCode = `${o.code}-${prefix.toLowerCase()}`;
      await client.query(`UPDATE shipping_option_type SET label = $1, code = $2 WHERE id = (SELECT shipping_option_type_id FROM shipping_option WHERE id = $3)`, [newLabel, newCode, o.id]);
    }

    // Show updated
    const { rows: updated } = await client.query(`
      SELECT so.id, so.name, sot.label, sot.code
      FROM shipping_option so
      LEFT JOIN shipping_option_type sot ON sot.id = so.shipping_option_type_id
      WHERE so.deleted_at IS NULL
      ORDER BY so.name
    `);
    console.log("\n=== SHIPPING OPTIONS AFTER ===");
    for (const o of updated) console.log(`  ${o.name} | ${o.label} (${o.code})`);
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
