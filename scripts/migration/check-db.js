/**
 * check-db.js — Compare table counts and data between old US and new EU West DBs.
 *
 * Usage: node scripts/migration/check-db.js
 *
 * Shows row counts per table for both databases and highlights differences.
 */
const { Pool } = require("pg");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const OLD_URL = process.env.OLD_DATABASE_URL ||
  "postgresql://postgres:piggiksouTDTcVnZJAVorkzeGifMxpQq@thomas.proxy.rlwy.net:13141/railway";
const NEW_URL = process.env.NEW_DATABASE_URL ||
  "postgresql://postgres:POjtaghtBYdLqaevBweZxtPuRMBzclAz@reseau.proxy.rlwy.net:45985/railway";

async function main() {
  const oldPool = new Pool({ connectionString: OLD_URL, ssl: { rejectUnauthorized: false }, max: 2 });
  const newPool = new Pool({ connectionString: NEW_URL, ssl: { rejectUnauthorized: false }, max: 2 });

  const tablesRes = await oldPool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  const tables = tablesRes.rows.map(r => r.table_name);

  console.log(`${"TABLE".padEnd(35)} ${"OLD".padEnd(8)} ${"NEW".padEnd(8)} ${"DIFF".padEnd(8)}`);
  console.log("-".repeat(65));

  let oldTotal = 0, newTotal = 0;
  for (const table of tables) {
    const oldCnt = await oldPool.query(`SELECT COUNT(*) as c FROM "${table}"`);
    const newCnt = await newPool.query(`SELECT COUNT(*) as c FROM "${table}"`);
    const o = parseInt(oldCnt.rows[0].c);
    const n = parseInt(newCnt.rows[0].c);
    oldTotal += o;
    newTotal += n;
    const diff = o !== n ? `${o - n}` : "✓";
    console.log(`${table.padEnd(35)} ${String(o).padEnd(8)} ${String(n).padEnd(8)} ${diff}`);
  }

  console.log("-".repeat(65));
  console.log(`${"TOTAL".padEnd(35)} ${String(oldTotal).padEnd(8)} ${String(newTotal).padEnd(8)}`);
  console.log(oldTotal === newTotal ? "✅ Match!" : "⚠️  Mismatch!");

  // Check specific critical data
  console.log("\n--- Critical checks ---");
  const checks = [
    ["region_country with region_id", "SELECT COUNT(*) FROM region_country WHERE region_id IS NOT NULL"],
    ["store", "SELECT COUNT(*) FROM store"],
    ["currency", "SELECT COUNT(*) FROM currency"],
    ["payment_provider", "SELECT COUNT(*) FROM payment_provider"],
  ];
  for (const [label, query] of checks) {
    const oldR = await oldPool.query(query);
    const newR = await newPool.query(query);
    console.log(`  ${label.padEnd(40)} OLD: ${oldR.rows[0].count.toString().padEnd(6)} NEW: ${newR.rows[0].count}`);
  }

  await oldPool.end();
  await newPool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
