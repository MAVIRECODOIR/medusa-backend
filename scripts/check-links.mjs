import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
await client.connect();

// Check how stock_locations link to fulfillment_sets
console.log("=== Stock location columns ===");
const slCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'stock_location' ORDER BY ordinal_position");
console.log(`  ${slCols.rows.map(c => c.column_name).join(', ')}`);

console.log("\n=== All stock locations ===");
const locs = await client.query("SELECT * FROM stock_location");
for (const r of locs.rows) console.log(`  ${r.name} (${r.id})`);

// Check link tables
console.log("\n=== Tables with 'stock_location' in name ===");
const slTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%stock_location%' ORDER BY table_name");
for (const r of slTables.rows) console.log(`  ${r.table_name}`);

console.log("\n=== Tables with 'fulfillment_set' in name ===");
const fsTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%fulfillment%' ORDER BY table_name");
for (const r of fsTables.rows) console.log(`  ${r.table_name}`);

// Check link table for stock_location - fulfillment_set
console.log("\n=== Link table columns and data ===");
const linkCandidates = ["stock_location_fulfillment_set", "fulfillment_set_stock_location", "stock_location_fulfillment_sets"];
for (const tbl of linkCandidates) {
  const exists = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${tbl}')`);
  if (exists.rows[0].exists) {
    console.log(`\n${tbl}:`);
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tbl}'`);
    console.log(`  Columns: ${cols.rows.map(c => c.column_name).join(', ')}`);
    const data = await client.query(`SELECT * FROM "${tbl}"`);
    for (const r of data.rows) console.log(`  ${JSON.stringify(r)}`);
  }
}

// Check if there's a stock_location_id or location_id in the fulfillment_set_* tables
const allLinks = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'fk_%' OR table_name LIKE 'link_%' OR table_name LIKE 'stock_location%' ORDER BY table_name");
console.log("\n=== All relevant tables ===");
for (const r of allLinks.rows) console.log(`  ${r.table_name}`);

// Check the actual fulfillment_set table data
console.log("\n=== Full fulfillment_set data ===");
const fullFs = await client.query("SELECT * FROM fulfillment_set");
for (const r of fullFs.rows) console.log(`  ${JSON.stringify(r)}`);

// Check if metadata in fulfillment_set contains stock location info
console.log("\n=== Fulfillment set metadata ===");
const fsMeta = await client.query("SELECT id, name, metadata FROM fulfillment_set WHERE metadata IS NOT NULL");
for (const r of fsMeta.rows) console.log(`  ${r.name}: ${JSON.stringify(r.metadata)}`);

// Check stock_location metadata
console.log("\n=== Stock location metadata ===");
const slMeta = await client.query("SELECT id, name, metadata FROM stock_location WHERE metadata IS NOT NULL");
for (const r of slMeta.rows) console.log(`  ${r.name}: ${JSON.stringify(r.metadata)}`);

// Now check the old US DB for PayPal settings comparison
const oldClient = new Client({
  connectionString: 'postgresql://postgres:piggiksouTDTcVnZJAVorkzeGifMxpQq@thomas.proxy.rlwy.net:13141/railway',
  ssl: { rejectUnauthorized: false }
});
await oldClient.connect();
const oldPaypalSettings = await oldClient.query("SELECT id, data FROM paypal_setting");
console.log("\n=== OLD DB PayPal settings ===");
for (const r of oldPaypalSettings.rows) {
  const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(`  ${r.id}: ${JSON.stringify(d)}`);
}
const oldPaypalConn = await oldClient.query("SELECT id, environment, is_active FROM paypal_connection");
console.log("\n=== OLD DB PayPal connections ===");
for (const r of oldPaypalConn.rows) console.log(`  ${r.id} | env=${r.environment} | active=${r.is_active}`);
await oldClient.end();

// Check EU DB paypal setting more completely
console.log("\n=== NEW DB PayPal full data ===");
const newPs = await client.query("SELECT * FROM paypal_setting");
for (const r of newPs.rows) {
  const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(`  ID: ${r.id}, data: ${JSON.stringify(d)}`);
}
const newPc = await client.query("SELECT * FROM paypal_connection");
for (const r of newPc.rows) {
  const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(`  ID: ${r.id} | env=${r.environment} | active=${r.is_active} | data: ${JSON.stringify(d).substring(0, 300)}`);
}

await client.end();
