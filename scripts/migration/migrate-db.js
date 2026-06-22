const { Pool } = require("pg");
const https = require("https");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const OLD_URL = "postgresql://postgres:piggiksouTDTcVnZJAVorkzeGifMxpQq@thomas.proxy.rlwy.net:13141/railway";
const NEW_URL = "postgresql://postgres:POjtaghtBYdLqaevBweZxtPuRMBzclAz@reseau.proxy.rlwy.net:45985/railway";

async function main() {
  const oldPool = new Pool({
    connectionString: OLD_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
  const newPool = new Pool({
    connectionString: NEW_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  const v1 = await oldPool.query("SELECT version()");
  console.log("✅ Old DB (US):", v1.rows[0].version.split(",")[0]);
  const v2 = await newPool.query("SELECT version()");
  console.log("✅ New DB (EU):", v2.rows[0].version.split(",")[0]);

  const sizeR = await oldPool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
  console.log("Old DB size:", sizeR.rows[0].size);

  // 1. Get full schema DDL using pg_dump functions
  console.log("\n=== Extracting schema from old DB ===");

  // Get all tables in dependency order
  const tablesRes = await oldPool.query(`
    SELECT pg_tables.tablename, pg_class.reltuples::bigint as row_est
    FROM pg_catalog.pg_tables
    LEFT JOIN pg_catalog.pg_class ON pg_class.relname = pg_tables.tablename
    WHERE pg_tables.schemaname = 'public' AND pg_tables.tablename != 'spatial_ref_sys'
    ORDER BY pg_tables.tablename
  `);
  const tables = tablesRes.rows.map(r => r.tablename);

  // Get extensions
  const extRes = await oldPool.query(`SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql')`);
  const extensions = extRes.rows.map(r => r.extname);

  // 2. Create extensions on new DB
  console.log("\n=== Creating extensions ===");
  for (const ext of extensions) {
    try {
      await newPool.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
      console.log(`  ✅ ${ext}`);
    } catch (e) {
      console.log(`  ⚠️  ${ext}: ${e.message.slice(0, 80)}`);
    }
  }

  // 3. Clear existing data and recreate schema
  console.log("\n=== Clearing new DB ===");
  await newPool.query("SET session_replication_role = 'replica'");

  // Drop all existing data
  for (const table of [...tables].reverse()) {
    await newPool.query(`TRUNCATE TABLE "${table}" CASCADE`);
  }
  console.log("  ✅ All tables truncated");

  // 4. Create tables with full DDL
  console.log("\n=== Creating tables ===");
  for (const table of tables) {
    const ddlRes = await oldPool.query(`
      SELECT 'CREATE TABLE IF NOT EXISTS "' || table_name || '" (' ||
        string_agg(
          '"' || column_name || '" ' ||
          CASE
            WHEN udt_name = 'varchar' AND character_maximum_length IS NOT NULL THEN 'varchar(' || character_maximum_length || ')'
            WHEN udt_name = 'bpchar' AND character_maximum_length IS NOT NULL THEN 'char(' || character_maximum_length || ')'
            WHEN udt_name = 'numeric' AND numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL THEN 'numeric(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN udt_name = 'numeric' AND numeric_precision IS NOT NULL THEN 'numeric(' || numeric_precision || ')'
            ELSE udt_name
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          ', ' ORDER BY ordinal_position
        ) || ');' as ddl
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      GROUP BY columns.table_name
    `, [table]);

    if (ddlRes.rows[0]?.ddl) {
      try {
        await newPool.query(ddlRes.rows[0].ddl);
        console.log(`  ✅ ${table}`);
      } catch (e) {
        if (e.message.includes("already exists")) {
          console.log(`  ✓ ${table} (exists)`);
        } else {
          console.log(`  ❌ ${table}: ${e.message.slice(0, 100)}`);
        }
      }
    }
  }

  // 5. Add primary keys and constraints
  console.log("\n=== Adding constraints ===");
  const pkRes = await oldPool.query(`
    SELECT
      conrelid::regclass::text as table_name,
      pg_get_constraintdef(oid) as condef
    FROM pg_catalog.pg_constraint
    WHERE contype IN ('p', 'f', 'u')
      AND connamespace = 'public'::regnamespace
    ORDER BY CASE contype WHEN 'p' THEN 0 WHEN 'u' THEN 1 ELSE 2 END
  `);

  for (const row of pkRes.rows) {
    try {
      await newPool.query(`ALTER TABLE "${row.table_name}" ADD CONSTRAINT IF NOT EXISTS ${row.condef}`);
      console.log(`  ✅ ${row.table_name}: ${row.condef.slice(0, 60)}`);
    } catch (e) {
      if (!e.message.includes("already exists")) {
        console.log(`  ⚠️  ${row.table_name}: ${e.message.slice(0, 100)}`);
      }
    }
  }

  // 6. Create indexes
  console.log("\n=== Creating indexes ===");
  const idxRes = await oldPool.query(`
    SELECT tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexdef NOT LIKE '%_pkey%'
    ORDER BY tablename
  `);

  for (const row of idxRes.rows) {
    try {
      await newPool.query(row.indexdef.replace("CREATE ", "CREATE INDEX IF NOT EXISTS ").replace("UNIQUE INDEX IF NOT EXISTS", "UNIQUE INDEX IF NOT EXISTS"));
    } catch (e) {
      if (!e.message.includes("already exists")) console.log(`  ⚠️  ${row.indexdef.slice(0, 60)}: ${e.message.slice(0, 60)}`);
    }
  }
  console.log(`  ✅ ${idxRes.rows.length} indexes`);

  // 7. Copy data
  console.log("\n=== Copying data ===");
  let totalRows = 0;

  for (const table of tables) {
    const cntRes = await oldPool.query(`SELECT COUNT(*) as c FROM "${table}"`);
    const count = parseInt(cntRes.rows[0].c);
    if (count === 0) { console.log(`  ${table}: 0 rows`); continue; }

    process.stdout.write(`  ${table}: ${count} rows -> `);

    const colRes = await oldPool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    const cols = colRes.rows.map(r => r.column_name);
    const quoted = cols.map(c => `"${c}"`);
    const placeholders = cols.map((_, i) => `$${i + 1}`);

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
          if (typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
          if (Array.isArray(v)) return v;
          return String(v);
        });

        try {
          await newPool.query(
            `INSERT INTO "${table}" (${quoted.join(",")}) VALUES (${placeholders.join(",")}) ON CONFLICT DO NOTHING`,
            vals
          );
          copied++;
        } catch (e) {
          if (!e.message.includes("duplicate key")) console.error(`\n    ERR: ${e.message.slice(0, 100)}`);
        }
      }
      offset += dataRes.rows.length;
    }

    totalRows += copied;
    console.log(`${copied} copied`);
  }

  // 8. Reset sequences  
  console.log("\n=== Resetting sequences ===");
  const seqRes = await oldPool.query(`
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  `);
  for (const { sequence_name } of seqRes.rows) {
    const tbl = sequence_name.replace(/_id_seq$/i, "").replace(/_seq$/i, "");
    try {
      await newPool.query(`SELECT setval('"${sequence_name}"', COALESCE((SELECT MAX(id)::bigint FROM "${tbl}"), 1))`);
    } catch {}
  }

  await newPool.query("SET session_replication_role = 'origin'");

  await oldPool.end();
  await newPool.end();
  console.log(`\n✅ Migration complete! ${totalRows} total rows migrated.`);
  console.log(`\n➡️  Next: Update DATABASE_URL in Medusa-Backend service to point to the new EU DB`);
  console.log(`   New URL: ${NEW_URL}`);
}

main().catch(err => { console.error("Migration failed:", err); process.exit(1); });
