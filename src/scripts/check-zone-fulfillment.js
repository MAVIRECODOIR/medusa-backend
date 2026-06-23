require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT sz.id, sz.name, sz.fulfillment_set_id, fs.name as fulfillment_set_name
      FROM service_zone sz
      LEFT JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
      WHERE sz.deleted_at IS NULL
      ORDER BY sz.name
    `);
    console.log("Service zones and their fulfillment sets:");
    for (const row of rows) {
      console.log(`  ${row.name} (${row.id}) -> ${row.fulfillment_set_name || 'NULL'} (${row.fulfillment_set_id})`);
    }
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
