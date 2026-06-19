const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: fset } = await client.query(`SELECT id, name FROM fulfillment_set WHERE deleted_at IS NULL`);
    console.log("Fulfillment sets:", fset);

    const { rows: lfs } = await client.query(`SELECT * FROM location_fulfillment_set WHERE deleted_at IS NULL`);
    console.log("\nLocation-fulfillment links:", lfs);

    const { rows: scsl } = await client.query(`SELECT * FROM sales_channel_stock_location WHERE deleted_at IS NULL`);
    console.log("\nSales channel-stock location links:", scsl);

    const { rows: sc } = await client.query(`SELECT id, name FROM sales_channel WHERE deleted_at IS NULL`);
    console.log("\nSales channels:", sc);

    const { rows: fp } = await client.query(`SELECT id FROM fulfillment_provider WHERE deleted_at IS NULL`);
    console.log("\nFulfillment providers:", fp);

    const { rows: lfp } = await client.query(`SELECT * FROM location_fulfillment_provider WHERE deleted_at IS NULL`);
    console.log("\nLocation-fulfillment provider links:", lfp);
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
