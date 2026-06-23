require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT id, type, country_code
      FROM geo_zone
      WHERE deleted_at IS NULL
      LIMIT 10
    `);
    console.log("Existing geo zones:");
    console.log(rows);
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
