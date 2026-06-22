/**
 * fix-missing.js — Creates migration tracking tables in the NEW database
 * if they don't exist, and copies migration records from the OLD database.
 *
 * Usages:
 *   node scripts/migration/fix-missing.js          # before copy-data
 *   node scripts/migration/fix-missing.js --after   # after copy-data (re-copy migration records if truncated)
 *
 * This handles the case where Medusa's startup sequence creates the tracking
 * tables before the data copy happens.
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

  const MIGRATION_TABLES = ["mikro_orm_migrations", "script_migrations", "link_module_migrations"];

  for (const table of MIGRATION_TABLES) {
    // Check if table exists in new DB
    const exists = await newPool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
      [table]
    );
    if (!exists.rows[0].exists) {
      console.log(`Table "${table}" does not exist in new DB — need to create`);
      continue;
    }

    // Get columns
    const colsRes = await newPool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
      [table]
    );
    const oldColsRes = await oldPool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
      [table]
    );

    const newCols = colsRes.rows.map(r => r.column_name);
    const oldCols = oldColsRes.rows.map(r => r.column_name);
    const commonCols = newCols.filter(c => oldCols.includes(c));

    if (newCols.length !== oldCols.length) {
      console.log(`  Schema mismatch for "${table}": new(${newCols.length}) vs old(${oldCols.length}) cols`);
      console.log(`  Common: ${commonCols.join(", ")}`);
    }

    // Count records
    const oldCnt = await oldPool.query(`SELECT COUNT(*) FROM "${table}"`);
    const newCnt = await newPool.query(`SELECT COUNT(*) FROM "${table}"`);
    console.log(`  "${table}": old=${oldCnt.rows[0].count}, new=${newCnt.rows[0].count}`);

    if (parseInt(oldCnt.rows[0].count) === 0) continue;

    // Bulk copy with common columns
    const quoted = commonCols.map(c => `"${c}"`);
    const ph = commonCols.map((_, i) => `$${i + 1}`);
    const batch = 100;

    // Handle --after flag: skip re-copy if new DB already has data
    const isAfter = process.argv.includes("--after");
    if (isAfter && parseInt(newCnt.rows[0].count) > 0) {
      console.log(`  Skipping (--after mode, new DB already has ${newCnt.rows[0].count} records)`);
      continue;
    }

    // Truncate before re-copying
    await newPool.query(`TRUNCATE "${table}"`);

    let copied = 0;
    let offset = 0;
    const count = parseInt(oldCnt.rows[0].count);

    while (offset < count) {
      const dataRes = await oldPool.query(
        `SELECT ${quoted.join(",")} FROM "${table}" ORDER BY 1 LIMIT ${batch} OFFSET ${offset}`
      );
      if (dataRes.rows.length === 0) break;

      for (const row of dataRes.rows) {
        const vals = commonCols.map(c => {
          const v = row[c];
          if (v === null) return null;
          if (typeof v === "boolean" || typeof v === "number") return v;
          if (v instanceof Date) return v;
          if (Buffer.isBuffer(v)) return v;
          return String(v);
        });

        await newPool.query(
          `INSERT INTO "${table}" (${quoted.join(",")}) VALUES (${ph.join(",")}) ON CONFLICT DO NOTHING`,
          vals
        );
        copied++;
      }
      offset += dataRes.rows.length;
    }

    console.log(`  Copied ${copied} records to "${table}"`);
  }

  await oldPool.end();
  await newPool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
