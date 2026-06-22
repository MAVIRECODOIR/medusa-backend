import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const tables = await client.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%api_key%' ORDER BY table_name"
);
console.log("Tables:", tables.rows.map((r) => r.table_name));

if (tables.rows.length > 0) {
  const keys = await client.query(
    "SELECT id, title, token, type FROM api_key LIMIT 10"
  );
  console.log("Keys:", JSON.stringify(keys.rows, null, 2));
}

await client.end();
