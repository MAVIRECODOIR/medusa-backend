import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const lfs = await c.query('SELECT * FROM location_fulfillment_set');
console.log('=== location_fulfillment_set ===');
for (const r of lfs.rows) console.log(JSON.stringify(r));

const opts = await c.query('SELECT so.id, so.name, sz.fulfillment_set_id FROM shipping_option so JOIN service_zone sz ON sz.id = so.service_zone_id');
console.log('\n=== Options per fulfillment set ===');
for (const r of opts.rows) console.log(JSON.stringify(r));

const sz = await c.query("SELECT sz.id, sz.name, sz.fulfillment_set_id, fs.name as set_name FROM service_zone sz JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id WHERE fs.deleted_at IS NULL ORDER BY fs.name, sz.name");
console.log('\n=== Active service zones ===');
for (const r of sz.rows) console.log(JSON.stringify(r));

// Check PayPal
const ps = await c.query("SELECT * FROM paypal_setting");
console.log('\n=== PayPal settings ===');
for (const r of ps.rows) {
  const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(JSON.stringify(d, null, 2));
}
const pc = await c.query("SELECT * FROM paypal_connection");
console.log('\n=== PayPal connections ===');
for (const r of pc.rows) {
  const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  console.log(`env=${r.environment}, active=${r.is_active}, data keys=${Object.keys(d || {}).join(', ')}`);
}
await c.end();
