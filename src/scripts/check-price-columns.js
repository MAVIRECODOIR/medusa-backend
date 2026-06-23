require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'price' 
      ORDER BY ordinal_position
    `);
    console.log("price columns:");
    console.log(rows);
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
