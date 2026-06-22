import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

// Old US DB
const oldDbUrl = "postgresql://postgres:piggiksouTDTcVnZJAVorkzeGifMxpQq@thomas.proxy.rlwy.net:13141/railway";
// New EU DB
const newDbUrl = ""; // Will try to construct or get from env

async function checkDb(url, label) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log(`\n=== ${label} ===`);
    
    // List all paypal tables
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%paypal%' ORDER BY table_name"
    );
    console.log("PayPal tables:", tables.rows.map(r => r.table_name).join(", "));
    
    for (const table of tables.rows) {
      const rows = await client.query(`SELECT * FROM "${table.table_name}" LIMIT 5`);
      console.log(`\n${table.table_name} (${rows.rowCount} rows shown):`);
      for (const row of rows.rows) {
        console.log("  ", JSON.stringify(row, (key, val) => {
          if (key === "data" && val && typeof val === "string" && val.length > 200) return val.substring(0, 200) + "...";
          return val;
        }, 2));
      }
      
      // Row count
      const count = await client.query(`SELECT COUNT(*) FROM "${table.table_name}"`);
      console.log(`  Total rows: ${count.rows[0].count}`);
    }
    
    await client.end();
  } catch (e) {
    console.log(`${label}: ${e.message}`);
  }
}

async function main() {
  await checkDb(oldDbUrl, "OLD US DB (thomas)");
  
  // Try to construct new DB URL from Railway env or hardcoded
  const pgPassword = process.env.PG_PASSWORD || process.env.RAILWAY_DATABASE_PASSWORD || "POjtaghtBYdLqaevBweZxtPuRMBzcl";
  const pgUser = process.env.PG_USER || process.env.RAILWAY_DATABASE_USER || "postgres";
  const pgDb = process.env.PG_DATABASE || process.env.RAILWAY_DATABASE_NAME || "railway";
  
  // Extract host and port from the partial Railway DATABASE_URL we know about
  // New EU DB is at reseau.proxy.rlwy.net:45985
  // We know the password starts with "POjtaghtBYdLqaevBweZxtPuRMBzcl" but let's try to get full URL
  
  const railwayDbUrl = process.env.DATABASE_URL || `postgresql://${pgUser}:${encodeURIComponent(pgPassword)}@reseau.proxy.rlwy.net:45985/${pgDb}`;
  await checkDb(railwayDbUrl, "NEW EU DB (reseau)");
}

main().catch(console.error);
