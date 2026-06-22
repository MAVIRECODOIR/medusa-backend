import pg from 'pg';
const { Client } = pg;

const newClient = new Client({
  connectionString: 'postgresql://postgres:POjtaghtBYdLqaevBweZxtPuRMBzclAz@reseau.proxy.rlwy.net:45985/railway',
  ssl: { rejectUnauthorized: false }
});
await newClient.connect();

// Find all PayPal-related tables
const tables = await newClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%paypal%' ORDER BY table_name");
console.log('=== NEW EU DB - PayPal tables ===');
for (const r of tables.rows) console.log(`  ${r.table_name}`);

// Find all PayPal-related tables
const tables2 = await newClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%paypal%' ORDER BY table_name");
if (tables2.rowCount > 0) {
  for (const tbl of tables2.rows) {
    const rows = await newClient.query(`SELECT * FROM "${tbl.table_name}" LIMIT 3`);
    console.log(`\n=== ${tbl.table_name} ===`);
    for (const r of rows.rows) console.log(`  ${JSON.stringify(r)}`);
  }
}

// Check regions
console.log('\n=== Regions ===');
const regions = await newClient.query('SELECT id, name, currency_code FROM region ORDER BY name');
for (const r of regions.rows) console.log(`  ${r.name} (${r.currency_code})`);

await newClient.end();

// Check old US DB for paypal tables
const oldClient = new Client({
  connectionString: 'postgresql://postgres:piggiksouTDTcVnZJAVorkzeGifMxpQq@thomas.proxy.rlwy.net:13141/railway',
  ssl: { rejectUnauthorized: false }
});
await oldClient.connect();
const oldTables = await oldClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%paypal%' ORDER BY table_name");
console.log('\n=== OLD US DB - PayPal tables ===');
for (const r of oldTables.rows) console.log(`  ${r.table_name}`);

if (oldTables.rowCount > 0) {
  for (const tbl of oldTables.rows) {
    const rows = await oldClient.query(`SELECT * FROM "${tbl.table_name}" LIMIT 3`);
    console.log(`\n=== ${tbl.table_name} ===`);
    for (const r of rows.rows) console.log(`  ${JSON.stringify(r)}`);
  }
}
await oldClient.end();
