import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
await client.connect();

console.log("=== Shipping profiles ===");
const profiles = await client.query("SELECT id, name, type FROM shipping_profile ORDER BY name");
for (const r of profiles.rows) console.log(`  ${r.id} | ${r.name} (${r.type})`);

console.log("\n=== All shipping options ===");
const opts = await client.query(`SELECT so.id, so.name, so.price_type, so.service_zone_id, so.shipping_profile_id, so.provider_id, so.shipping_option_type_id FROM shipping_option so ORDER BY so.name`);
for (const r of opts.rows) console.log(`  ${r.name} (${r.id}) | ${r.price_type} | sz=${r.service_zone_id} | prof=${r.shipping_profile_id} | prov=${r.provider_id}`);

console.log("\n=== Shipping option types ===");
const sotCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'shipping_option_type' ORDER BY ordinal_position");
console.log("Columns: " + sotCols.rows.map(c => c.column_name).join(', '));
const types = await client.query("SELECT * FROM shipping_option_type ORDER BY created_at");
for (const r of types.rows) console.log(`  ${r.id} | ${r.label || r.name || '(no label)'} | created=${r.created_at}`);

console.log("\n=== Shipping option types count ===");
const cnt = await client.query("SELECT COUNT(*) as c FROM shipping_option_type");
console.log(`  Total: ${cnt.rows[0].c}`);

console.log("\n=== Service zones ===");
const zones = await client.query("SELECT sz.id, sz.name, sz.fulfillment_set_id FROM service_zone sz");
for (const r of zones.rows) console.log(`  ${r.name} (${r.id}) | set=${r.fulfillment_set_id}`);

console.log("\n=== Geo zones ===");
const geo = await client.query("SELECT id, service_zone_id, type, country_code, province_code, city, metadata FROM geo_zone ORDER BY service_zone_id, type");
for (const r of geo.rows) console.log(`  sz=${r.service_zone_id} | ${r.type}=${r.country_code || r.province_code || r.city}`);

console.log("\n=== Fulfillment sets (full) ===");
const fsCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fulfillment_set' ORDER BY ordinal_position");
console.log("Columns: " + fsCols.rows.map(c => c.column_name).join(', '));
const sets = await client.query("SELECT * FROM fulfillment_set");
for (const r of sets.rows) {
  const loc = r.location_id || r.stock_location_id || '(missing)';
  console.log(`  ${r.name} (${r.id}) | type=${r.type} | loc=${loc} | created=${r.created_at}`);
}

console.log("\n=== Shipping option types count by name ===");
const typeCounts = await client.query("SELECT name, COUNT(*) as cnt FROM shipping_option_type GROUP BY name HAVING COUNT(*) > 1 ORDER BY cnt DESC");
if (typeCounts.rowCount === 0) console.log("  No duplicates");
else for (const r of typeCounts.rows) console.log(`  "${r.name}" × ${r.cnt}`);

// Check how shipping_options link to regions
console.log("\n=== Shipping option -> service zone -> geo_zone chain ===");
const chain = await client.query(`
  SELECT so.name as option_name, sz.name as zone_name, gz.country_code, fs.name as set_name
  FROM shipping_option so
  JOIN service_zone sz ON sz.id = so.service_zone_id
  JOIN geo_zone gz ON gz.service_zone_id = sz.id
  JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
  ORDER BY so.name, gz.country_code
`);
for (const r of chain.rows) console.log(`  ${r.option_name} -> ${r.zone_name} (${r.country_code}) [set: ${r.set_name}]`);

// Check for old service zones with no options (orphaned)
console.log("\n=== Orphaned service zones (no options) ===");
const orphaned = await client.query(`
  SELECT sz.id, sz.name, sz.fulfillment_set_id
  FROM service_zone sz
  LEFT JOIN shipping_option so ON so.service_zone_id = sz.id
  WHERE so.id IS NULL
`);
for (const r of orphaned.rows) console.log(`  ${r.name} (${r.id}) set=${r.fulfillment_set_id}`);

// PayPal settings
console.log("\n=== PayPal settings ===");
const ps = await client.query("SELECT id, data FROM paypal_setting");
for (const r of ps.rows) {
  const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(`  ID: ${r.id} => ${JSON.stringify(d)}`);
}

// PayPal credentials
console.log("\n=== PayPal connections ===");
const pc = await client.query("SELECT id, environment, is_active, data FROM paypal_connection");
for (const r of pc.rows) {
  const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(`  ID: ${r.id} | env=${r.environment} | active=${r.is_active}`);
  console.log(`  data keys: ${Object.keys(d || {}).join(', ')}`);
}

// Check which service zones the London warehouse fulfillment sets have
console.log("\n=== Service zones per fulfillment set ===");
const setsZones = await client.query(`
  SELECT fs.id as set_id, fs.name as set_name, sz.id as zone_id, sz.name as zone_name
  FROM fulfillment_set fs
  LEFT JOIN service_zone sz ON sz.fulfillment_set_id = fs.id
  ORDER BY fs.name, sz.name
`);
let currentSet = '';
for (const r of setsZones.rows) {
  if (r.set_id !== currentSet) {
    console.log(`\n  Fulfillment set: ${r.set_name} (${r.set_id})`);
    currentSet = r.set_id;
  }
  console.log(`    Service zone: ${r.zone_name || '(none)'} (${r.zone_id || 'N/A'})`);
}

await client.end();
