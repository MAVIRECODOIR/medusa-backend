import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Get the Default profile id
const defaultP = await c.query("SELECT id FROM shipping_profile WHERE type = 'default' LIMIT 1");
const defaultId = defaultP.rows[0]?.id;
console.log("Default profile ID:", defaultId);

// Get the Standard profile id
const standardP = await c.query("SELECT id FROM shipping_profile WHERE type = 'standard' LIMIT 1");
const standardId = standardP.rows[0]?.id;
console.log("Standard profile ID:", standardId);

// Check shipping options on standard profile
const opts = await c.query("SELECT id, name FROM shipping_option WHERE shipping_profile_id = $1", [standardId]);
console.log(`Shipping options on Standard profile: ${opts.rowCount}`, opts.rows.map(r => r.name));

// Check carts that have shipping methods with these options
const carts = await c.query(`
  SELECT DISTINCT c.id, c.email
  FROM cart c
  JOIN cart_shipping_method csm ON csm.cart_id = c.id
  WHERE c.completed_at IS NULL
`);
console.log(`Active carts with shipping methods: ${carts.rowCount}`);

// Delete shipping options on Standard profile (ensure-defaults will recreate on Default)
if (opts.rowCount > 0) {
  await c.query("DELETE FROM shipping_option WHERE shipping_profile_id = $1", [standardId]);
  console.log(`Deleted ${opts.rowCount} shipping options from Standard profile`);
}

// Delete the Standard profile
await c.query("DELETE FROM shipping_profile WHERE id = $1", [standardId]);
console.log("Deleted Standard shipping profile");

await c.end();
