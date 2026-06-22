import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Check shipping profiles
const profiles = await client.query("SELECT id, name, type FROM shipping_profile ORDER BY name");
console.log("\nShipping profiles:", JSON.stringify(profiles.rows, null, 2));

// Check products with non-default profiles
const products = await client.query(`
  SELECT p.id, p.title, sp.name as profile_name, sp.type as profile_type
  FROM product p
  JOIN shipping_profile sp ON p.shipping_profile_id = sp.id
  WHERE sp.name != 'Default'
  ORDER BY sp.name, p.title
`);
console.log("\nProducts with non-default profiles:", JSON.stringify(products.rows, null, 2));
console.log(`Count: ${products.rowCount}`);

// Check total products
const total = await client.query("SELECT COUNT(*) FROM product");
console.log("\nTotal products:", total.rows[0].count);

// Check which profiles have shipping options defined
const options = await client.query(`
  SELECT sp.name, COUNT(so.id) as option_count
  FROM shipping_profile sp
  LEFT JOIN shipping_option so ON so.shipping_profile_id = sp.id
  GROUP BY sp.id, sp.name
  ORDER BY sp.name
`);
console.log("\nShipping options per profile:", JSON.stringify(options.rows, null, 2));

// Check if there's a default shipping option for each region
const regionOptions = await client.query(`
  SELECT r.name as region, so.name as option_name, so.price_type, so.amount, sp.name as profile_name
  FROM shipping_option so
  JOIN region r ON so.region_id = r.id
  JOIN shipping_profile sp ON so.shipping_profile_id = sp.id
  ORDER BY r.name, sp.name
`);
console.log("\nShipping options by region:", JSON.stringify(regionOptions.rows, null, 2));

await client.end();
