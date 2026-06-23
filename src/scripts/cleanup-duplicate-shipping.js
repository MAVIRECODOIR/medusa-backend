require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("=== CLEANING UP DUPLICATE SHIPPING OPTIONS ===");

    // Get all fulfillment sets
    const { rows: fulfillmentSets } = await client.query(`
      SELECT id, name
      FROM fulfillment_set
      WHERE deleted_at IS NULL
      ORDER BY name
    `);

    console.log("\n=== FULFILLMENT SETS ===");
    for (const fs of fulfillmentSets) {
      console.log(`  ${fs.name} (${fs.id})`);
    }

    // Keep only Main Warehouse - London shipping
    const keepFulfillmentSet = fulfillmentSets.find(fs => fs.name === "Main Warehouse - London shipping");
    
    if (!keepFulfillmentSet) {
      console.log("ERROR: Main Warehouse - London shipping not found");
      return;
    }

    console.log(`\n=== KEEPING: ${keepFulfillmentSet.name} (${keepFulfillmentSet.id}) ===`);

    // Delete other fulfillment sets
    for (const fs of fulfillmentSets) {
      if (fs.id === keepFulfillmentSet.id) continue;

      console.log(`Deleting: ${fs.name} (${fs.id})`);
      
      // Soft delete the fulfillment set
      await client.query(`
        UPDATE fulfillment_set
        SET deleted_at = NOW()
        WHERE id = $1
      `, [fs.id]);

      // Soft delete associated service zones
      await client.query(`
        UPDATE service_zone
        SET deleted_at = NOW()
        WHERE fulfillment_set_id = $1
      `, [fs.id]);

      // Soft delete associated shipping options
      await client.query(`
        UPDATE shipping_option
        SET deleted_at = NOW()
        WHERE service_zone_id IN (
          SELECT id FROM service_zone WHERE fulfillment_set_id = $1
        )
      `, [fs.id]);
    }

    // Also delete any orphaned service zones (from previously deleted fulfillment sets)
    console.log("\n=== CLEANING UP ORPHANED SERVICE ZONES ===");
    
    // Get zones that reference non-existent or deleted fulfillment sets
    const { rows: orphanedZones } = await client.query(`
      SELECT sz.id, sz.name, sz.fulfillment_set_id, fs.name as fulfillment_set_name
      FROM service_zone sz
      LEFT JOIN fulfillment_set fs ON fs.id = sz.fulfillment_set_id
      WHERE sz.deleted_at IS NULL 
        AND (fs.deleted_at IS NOT NULL OR fs.id IS NULL)
    `);

    console.log(`Found ${orphanedZones.length} orphaned zones:`);
    for (const zone of orphanedZones) {
      console.log(`  ${zone.name} (${zone.id}) -> ${zone.fulfillment_set_name || 'NULL'} (${zone.fulfillment_set_id})`);
      
      // Delete shipping options for this zone
      await client.query(`
        UPDATE shipping_option
        SET deleted_at = NOW()
        WHERE service_zone_id = $1 AND deleted_at IS NULL
      `, [zone.id]);

      // Delete the zone
      await client.query(`
        UPDATE service_zone
        SET deleted_at = NOW()
        WHERE id = $1
      `, [zone.id]);
    }

    // Verify final state
    const { rows: finalFulfillmentSets } = await client.query(`
      SELECT id, name
      FROM fulfillment_set
      WHERE deleted_at IS NULL
      ORDER BY name
    `);

    const { rows: finalShippingOptions } = await client.query(`
      SELECT COUNT(*) as total
      FROM shipping_option
      WHERE deleted_at IS NULL
    `);

    console.log("\n=== FINAL STATE ===");
    console.log(`Fulfillment sets: ${finalFulfillmentSets.length}`);
    for (const fs of finalFulfillmentSets) {
      console.log(`  ${fs.name} (${fs.id})`);
    }
    console.log(`Total shipping options: ${finalShippingOptions[0].total}`);

    console.log("\n=== CLEANUP COMPLETE ===");

  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
