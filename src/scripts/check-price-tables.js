require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%price%'");
    console.log(rows);
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
