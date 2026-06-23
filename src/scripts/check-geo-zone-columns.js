require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'geo_zone'
      ORDER BY ordinal_position
    `);
    console.log("geo_zone columns:");
    console.log(rows);
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
