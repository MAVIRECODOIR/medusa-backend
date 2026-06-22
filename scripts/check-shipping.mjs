import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Product columns relating to shipping
const prodCols = await c.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'product' AND column_name LIKE '%shipping%' ORDER BY column_name"
);
console.log("Product shipping columns:", JSON.stringify(prodCols.rows));

// Check junction tables
const junc = await c.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%product%shipping%' OR table_name LIKE '%shipping%product%') ORDER BY table_name"
);
console.log("Junction tables:", JSON.stringify(junc.rows.map((r) => r.table_name)));

// Product_shipping_profile junction
const junc2 = await c.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%product%profile%' ORDER BY table_name"
);
console.log("Profile junction:", JSON.stringify(junc2.rows.map((r) => r.table_name)));

// Check shipping_option with profiles
const opts = await c.query(`SELECT so.id, so.name, so.shipping_profile_id, sp.name as profile_name
  FROM shipping_option so
  JOIN shipping_profile sp ON so.shipping_profile_id = sp.id`);
console.log("Shipping options:", JSON.stringify(opts.rows, null, 2));

// See if there's a product_shipping_profile table
const psp = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_shipping_profile'");
if (psp.rows.length > 0) {
  const data = await c.query("SELECT * FROM product_shipping_profile LIMIT 10");
  console.log("product_shipping_profile:", JSON.stringify(data.rows, null, 2));
}

await c.end();
