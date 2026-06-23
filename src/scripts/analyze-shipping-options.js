require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("=== ANALYZING SHIPPING OPTIONS ===");
    
    // Count total shipping options
    const { rows: countResult } = await client.query(`
      SELECT COUNT(*) as total
      FROM shipping_option
      WHERE deleted_at IS NULL
    `);
    console.log(`Total shipping options: ${countResult[0].total}`);

    // Group by name
    const { rows: byName } = await client.query(`
      SELECT so.name, COUNT(*) as count
      FROM shipping_option so
      WHERE so.deleted_at IS NULL
      GROUP BY so.name
      ORDER BY count DESC
    `);
    console.log("\n=== SHIPPING OPTIONS BY NAME ===");
    for (const row of byName) {
      console.log(`  ${row.name}: ${row.count} duplicates`);
    }

    // Get fulfillment sets and service zones
    const { rows: fulfillmentSets } = await client.query(`
      SELECT fs.id, fs.name, COUNT(DISTINCT sz.id) as zone_count
      FROM fulfillment_set fs
      LEFT JOIN service_zone sz ON sz.fulfillment_set_id = fs.id
      WHERE fs.deleted_at IS NULL
      GROUP BY fs.id, fs.name
      ORDER BY fs.name
    `);
    console.log("\n=== FULFILLMENT SETS ===");
    for (const fs of fulfillmentSets) {
      console.log(`  ${fs.name} (${fs.id}): ${fs.zone_count} service zones`);
    }

    // Get service zones with geo zones
    const { rows: serviceZones } = await client.query(`
      SELECT sz.id, sz.name, fs.name as fulfillment_set_name,
             COUNT(DISTINCT gz.id) as geo_zone_count
      FROM service_zone sz
      JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
      LEFT JOIN geo_zone gz ON gz.service_zone_id = sz.id
      WHERE sz.deleted_at IS NULL
      GROUP BY sz.id, sz.name, fs.name
      ORDER BY fs.name, sz.name
    `);
    console.log("\n=== SERVICE ZONES ===");
    for (const sz of serviceZones) {
      console.log(`  ${sz.fulfillment_set_name} - ${sz.name} (${sz.id}): ${sz.geo_zone_count} geo zones`);
    }

    // Get stock locations
    const { rows: stockLocations } = await client.query(`
      SELECT sl.id, sl.name, sl.address_id
      FROM stock_location sl
      WHERE sl.deleted_at IS NULL
      ORDER BY sl.name
    `);
    console.log("\n=== STOCK LOCATIONS ===");
    for (const sl of stockLocations) {
      console.log(`  ${sl.name} (${sl.id})`);
    }

    // Get shipping options by service zone
    const { rows: byZone } = await client.query(`
      SELECT sz.name as zone_name, fs.name as fulfillment_set_name,
             so.name as shipping_option_name, COUNT(*) as count
      FROM shipping_option so
      JOIN service_zone sz ON sz.id = so.service_zone_id
      JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
      WHERE so.deleted_at IS NULL
      GROUP BY sz.id, sz.name, fs.name, so.name
      ORDER BY fs.name, sz.name, count DESC
    `);
    console.log("\n=== SHIPPING OPTIONS BY SERVICE ZONE ===");
    for (const row of byZone) {
      console.log(`  ${row.fulfillment_set_name} - ${row.zone_name} - ${row.shipping_option_name}: ${row.count}`);
    }

  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
