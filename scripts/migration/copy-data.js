/**
 * copy-data.js — Copies ALL data from the old US PostgreSQL to the new EU West PostgreSQL.
 *
 * Usage: node scripts/migration/copy-data.js
 *
 * Environment:
 *   - OLD_DATABASE_URL (or defaults to the old US Railway PG)
 *   - NEW_DATABASE_URL (or defaults to the new EU West Railway PG)
 *
 * What it does:
 *   1. Reads schema/column types from the OLD database
 *   2. Creates migration tracking tables in the NEW database if missing
 *   3. Truncates ALL tables in the NEW database (CASCADE)
 *   4. Copies every table row-by-row from OLD to NEW with ON CONFLICT DO NOTHING
 *   5. Sets session_replication_role = 'replica' to bypass FK checks during insert
 *
 * Notes:
 *   - Requires `pg` module (npm install pg if needed)
 *   - Handles jsonb, arrays, dates, booleans, and Buffer types
 *   - Errors are logged but non-fatal (continues to next row/table)
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

  // Check types of each column in old DB to handle jsonb/array properly
  const typeRes = await oldPool.query(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const colTypes = {};
  for (const r of typeRes.rows) {
    if (!colTypes[r.table_name]) colTypes[r.table_name] = {};
    colTypes[r.table_name][r.column_name] = r.udt_name;
  }

  // Create missing migration tables
  await newPool.query(`
    CREATE TABLE IF NOT EXISTS "mikro_orm_migrations" (
      "id" int NOT NULL,
      "name" varchar(255) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "mikro_orm_migrations_pkey" PRIMARY KEY ("id")
    )
  `);
  await newPool.query(`
    CREATE TABLE IF NOT EXISTS "script_migrations" (
      "id" text NOT NULL,
      "script_name" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "script_migrations_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log("Migration tracking tables created");

  // Get tables from old DB
  const tablesRes = await oldPool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  const tables = tablesRes.rows.map(r => r.table_name);

  // Truncate all tables in new DB
  await newPool.query("SET session_replication_role = 'replica'");
  for (const table of tables) {
    try { await newPool.query(`TRUNCATE "${table}" CASCADE`); } catch {}
  }
  console.log("All tables truncated\n");

  // Copy data
  let total = 0;
  for (const table of tables) {
    const cntRes = await oldPool.query(`SELECT COUNT(*) as c FROM "${table}"`);
    const count = parseInt(cntRes.rows[0].c);
    if (count === 0) continue;

    process.stdout.write(`  ${table}: ${count} rows -> `);

    const colsRes = await oldPool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
      [table]
    );
    const cols = colsRes.rows.map(r => r.column_name);
    const quoted = cols.map(c => `"${c}"`);
    const ph = cols.map((_, i) => `$${i + 1}`);

    let copied = 0;
    const BATCH = 100;
    let offset = 0;

    while (offset < count) {
      const dataRes = await oldPool.query(`SELECT * FROM "${table}" ORDER BY 1 LIMIT ${BATCH} OFFSET ${offset}`);
      if (dataRes.rows.length === 0) break;

      for (const row of dataRes.rows) {
        const vals = cols.map(c => {
          const v = row[c];
          if (v === null) return null;
          if (typeof v === "boolean" || typeof v === "number") return v;
          if (v instanceof Date) return v;
          if (Buffer.isBuffer(v)) return v;
          const type = colTypes[table]?.[c];
          if (type === "jsonb" || type === "json") return JSON.stringify(v);
          if (Array.isArray(v)) return v;
          if (typeof v === "object") return JSON.stringify(v);
          return String(v);
        });

        try {
          await newPool.query(
            `INSERT INTO "${table}" (${quoted.join(",")}) VALUES (${ph.join(",")}) ON CONFLICT DO NOTHING`,
            vals
          );
          copied++;
        } catch (e) {
          if (!e.message.includes("duplicate key")) process.stdout.write(`\n    ERR: ${e.message.slice(0, 120)}`);
        }
      }
      offset += dataRes.rows.length;
    }

    total += copied;
    console.log(`${copied} copied`);
  }

  await newPool.query("SET session_replication_role = 'origin'");
  await oldPool.end();
  await newPool.end();
  console.log(`\n✅ Done! ${total} total rows migrated.`);
}

main().catch(err => { console.error(err); process.exit(1); });
