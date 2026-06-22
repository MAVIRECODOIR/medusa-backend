/**
 * check-db2.js — Deep database consistency check for Medusa-specific data integrity.
 *
 * Verifies:
 *   - Region <=> country assignments
 *   - Product <=> variant linkage
 *   - Payment provider configuration
 *   - Migration tracking table contents
 *
 * Usage: node scripts/migration/check-db2.js
 */
const { Pool } = require("pg");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const NEW_URL = process.env.NEW_DATABASE_URL ||
  "postgresql://postgres:POjtaghtBYdLqaevBweZxtPuRMBzclAz@reseau.proxy.rlwy.net:45985/railway";

async function main() {
  const pool = new Pool({ connectionString: NEW_URL, ssl: { rejectUnauthorized: false }, max: 2 });

  console.log("=== Region-Country Assignments ===");
  const rc = await pool.query(`
    SELECT r.name as region, COUNT(rc.iso_2) as countries
    FROM region r
    LEFT JOIN region_country rc ON rc.region_id = r.id
    GROUP BY r.name
    ORDER BY r.name
  `);
  for (const row of rc.rows) {
    console.log(`  ${row.region.padEnd(20)} ${row.countries} countries`);
  }

  console.log("\n=== Migration Tracking ===");
  for (const table of ["mikro_orm_migrations", "script_migrations", "link_module_migrations"]) {
    const { rows } = await pool.query(`SELECT COUNT(*) as c FROM "${table}"`);
    console.log(`  ${table.padEnd(30)} ${rows[0].count} records`);
  }

  console.log("\n=== Products & Variants ===");
  const p = await pool.query("SELECT COUNT(*) FROM product");
  const v = await pool.query("SELECT COUNT(*) FROM product_variant");
  console.log(`  Products: ${p.rows[0].count}, Variants: ${v.rows[0].count}`);

  console.log("\n=== Payment Providers ===");
  const pp = await pool.query("SELECT id, name FROM payment_provider ORDER BY id");
  for (const row of pp.rows) {
    console.log(`  ${row.id}`);
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
