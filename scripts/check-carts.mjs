import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Total product count
const total = await c.query("SELECT COUNT(*) FROM product WHERE deleted_at IS NULL");
console.log("Total products:", total.rows[0].count);

// Count active and deleted profile links
const linkCounts = await c.query(`
  SELECT deleted_at IS NULL as active, COUNT(*) 
  FROM product_shipping_profile GROUP BY active
`);
console.log("Profile link counts:", JSON.stringify(linkCounts.rows));

// Products DELETED from profile but still in db
const orphaned = await c.query(`
  SELECT p.id, p.title
  FROM product p
  WHERE p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_shipping_profile psp WHERE psp.product_id = p.id AND psp.deleted_at IS NULL
  )
  ORDER BY p.title
`);
console.log("\nOrphaned (no active profile):", JSON.stringify(orphaned.rows, null, 2));

// Also check if product table has shipping_profile_id directly
const hasCol = await c.query(`
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'product' AND column_name = 'shipping_profile_id'
`);
console.log("\nProduct has shipping_profile_id col:", hasCol.rows.length > 0);

// Check recent carts with issues
const carts = await c.query(`
  SELECT c.id, c.email, c.completed_at, c.created_at
  FROM cart c
  WHERE c.completed_at IS NULL
  ORDER BY c.created_at DESC
  LIMIT 5
`);
console.log("\nActive carts:", JSON.stringify(carts.rows, null, 2));

await c.end();
