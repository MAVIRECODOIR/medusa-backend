import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Products with active profile links (not deleted)
const active = await c.query(`
  SELECT psp.product_id, p.title, psp.shipping_profile_id, sp.name as profile_name
  FROM product_shipping_profile psp
  JOIN product p ON p.id = psp.product_id
  JOIN shipping_profile sp ON sp.id = psp.shipping_profile_id
  WHERE psp.deleted_at IS NULL
  ORDER BY p.title
`);
console.log("Active product-profile links:", JSON.stringify(active.rows, null, 2));

// Products with NO shipping profile link
const noLink = await c.query(`
  SELECT p.id, p.title
  FROM product p
  WHERE NOT EXISTS (
    SELECT 1 FROM product_shipping_profile psp WHERE psp.product_id = p.id AND psp.deleted_at IS NULL
  )
  AND p.deleted_at IS NULL
  ORDER BY p.title
`);
console.log("\nProducts with NO profile link:", JSON.stringify(noLink.rows, null, 2));

// Products linked to Standard profile specifically
const standard = await c.query(`
  SELECT p.id, p.title
  FROM product_shipping_profile psp
  JOIN product p ON p.id = psp.product_id
  WHERE psp.shipping_profile_id = 'sp_01KVFH59DP3QFQBPT7JXTZV8TC' AND psp.deleted_at IS NULL
  ORDER BY p.title
`);
console.log("\nProducts on Standard profile:", JSON.stringify(standard.rows, null, 2));

await c.end();
