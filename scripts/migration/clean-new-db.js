/**
 * clean-new-db.js — Drops ALL tables and sequences from the new EU West DB,
 * giving Medusa a clean slate to recreate via migrations on next deploy.
 *
 * Usage: node scripts/migration/clean-new-db.js
 * Then:  Trigger a Railway deploy to let Medusa recreate the schema.
 * Then:  Run copy-data.js to populate the fresh schema.
 *
 * WARNING: This DESTROYS all data in the target database.
 */
const { Pool } = require("pg");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const NEW_URL = process.env.NEW_DATABASE_URL ||
  "postgresql://postgres:POjtaghtBYdLqaevBweZxtPuRMBzclAz@reseau.proxy.rlwy.net:45985/railway";

async function main() {
  const pool = new Pool({ connectionString: NEW_URL, ssl: { rejectUnauthorized: false }, max: 2 });

  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );

  await pool.query("SET session_replication_role = 'replica'");

  for (const { table_name } of tables.rows) {
    await pool.query(`DROP TABLE IF EXISTS "${table_name}" CASCADE`);
  }

  const seqs = await pool.query(
    "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'"
  );
  for (const { sequence_name } of seqs.rows) {
    await pool.query(`DROP SEQUENCE IF EXISTS "${sequence_name}"`);
  }

  await pool.query("SET session_replication_role = 'origin'");
  await pool.end();

  console.log(`Dropped ${tables.rows.length} tables and ${seqs.rows.length} sequences.`);
  console.log("Now restart the medusa-backend service on Railway to let Medusa recreate the schema via migrations.");
  console.log("Then copy data from the old DB to the new DB.");
}

main().catch(err => { console.error(err); process.exit(1); });
