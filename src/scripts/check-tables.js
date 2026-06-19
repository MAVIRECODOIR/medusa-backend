const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE '%fulfill%' OR table_name = 'stock_location')
      ORDER BY table_name
    `);
    console.log("Tables:", tables.map(r => r.table_name).join(", "));

    for (const t of tables) {
      const { rows: cols } = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [t.table_name]);
      console.log(`\n${t.table_name}:`);
      cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
    }
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
