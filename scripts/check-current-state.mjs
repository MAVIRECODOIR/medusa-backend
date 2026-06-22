import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
await client.connect();

// Check shipping profiles
const profiles = await client.query("SELECT id, name, type FROM shipping_profile ORDER BY name");
console.log("\n=== Shipping profiles ===");
for (const r of profiles.rows) console.log(`  ${r.id} | ${r.name} (${r.type})`);

// Products on each profile (via product_shipping_profile link)
const prods = await client.query(`
  SELECT sp.name, COUNT(psp.product_id) as product_count
  FROM shipping_profile sp
  LEFT JOIN product_shipping_profile psp ON psp.shipping_profile_id = sp.id
  GROUP BY sp.id, sp.name
  ORDER BY sp.name
`);
console.log("\n=== Products per profile ===");
for (const r of prods.rows) console.log(`  ${r.name}: ${r.product_count} product(s)`);

// Options per profile
const opts = await client.query(`
  SELECT sp.name, so.name as option_name, so.price_type, so.amount, r.name as region
  FROM shipping_option so
  JOIN shipping_profile sp ON so.shipping_profile_id = sp.id
  JOIN region r ON so.region_id = r.id
  ORDER BY sp.name, so.name
`);
console.log("\n=== Shipping options ===");
for (const r of opts.rows) console.log(`  [${r.name}] ${r.option_name} | ${r.price_type} ${r.amount} | ${r.region}`);

// Check regions and currencies
const regions = await client.query("SELECT id, name, currency_code FROM region ORDER BY name");
console.log("\n=== Regions ===");
for (const r of regions.rows) console.log(`  ${r.name} (${r.currency_code})`);

// Check PayPal settings
const paypalSettings = await client.query("SELECT * FROM paypal_setting");
console.log("\n=== PayPal settings ===");
for (const r of paypalSettings.rows) {
  const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(`  ID: ${r.id}, Data: currency=${data.currency}, rest=${JSON.stringify(data)}`);
}

// Check PayPal connections
const paypalConn = await client.query("SELECT * FROM paypal_connection");
console.log("\n=== PayPal connections ===");
for (const r of paypalConn.rows) {
  const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(`  ID: ${r.id}, env=${r.environment}, active=${r.is_active}, data keys=${Object.keys(data || {})}`);
}

// Count duplicate shipping options
const dupes = await client.query(`
  SELECT name, region_id, shipping_profile_id, COUNT(*) as cnt
  FROM shipping_option
  GROUP BY name, region_id, shipping_profile_id
  HAVING COUNT(*) > 1
  ORDER BY cnt DESC
`);
console.log("\n=== Duplicate shipping options ===");
if (dupes.rowCount === 0) console.log("  None found");
else for (const r of dupes.rows) console.log(`  "${r.name}" × ${r.cnt} (region=${r.region_id}, profile=${r.shipping_profile_id})`);

await client.end();
