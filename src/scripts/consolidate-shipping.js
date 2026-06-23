require('dotenv').config();
const { Client } = require("pg");
const { v4: uuidv4 } = require("uuid");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("=== CONSOLIDATING SHIPPING TO MAIN WAREHOUSE - LONDON ===");

    // Get the Main Warehouse - London fulfillment set
    const { rows: mainFulfillmentSet } = await client.query(`
      SELECT id, name
      FROM fulfillment_set
      WHERE name = 'Main Warehouse - London shipping' AND deleted_at IS NULL
    `);

    if (mainFulfillmentSet.length === 0) {
      console.log("ERROR: Main Warehouse - London shipping fulfillment set not found");
      return;
    }

    const mainFulfillmentSetId = mainFulfillmentSet[0].id;
    console.log(`Main fulfillment set: ${mainFulfillmentSet[0].name} (${mainFulfillmentSetId})`);

    // Get the London Warehouse fulfillment set to delete
    const { rows: londonFulfillmentSet } = await client.query(`
      SELECT id, name
      FROM fulfillment_set
      WHERE name = 'London Warehouse' AND deleted_at IS NULL
    `);

    if (londonFulfillmentSet.length > 0) {
      const londonFulfillmentSetId = londonFulfillmentSet[0].id;
      console.log(`Found London Warehouse fulfillment set to delete: ${londonFulfillmentSet[0].name} (${londonFulfillmentSetId})`);

      // Soft delete the London Warehouse fulfillment set
      await client.query(`
        UPDATE fulfillment_set
        SET deleted_at = NOW()
        WHERE id = $1
      `, [londonFulfillmentSetId]);
      console.log(`✅ Deleted London Warehouse fulfillment set`);
    } else {
      console.log("⏭️ London Warehouse fulfillment set not found, skipping deletion");
    }

    // Get existing service zones for Main Warehouse - London
    const { rows: existingZones } = await client.query(`
      SELECT id, name
      FROM service_zone
      WHERE fulfillment_set_id = $1 AND deleted_at IS NULL
    `, [mainFulfillmentSetId]);

    console.log(`\nExisting service zones for Main Warehouse - London: ${existingZones.length}`);
    for (const zone of existingZones) {
      console.log(`  - ${zone.name} (${zone.id})`);
    }

    // Define the service zones we want
    const desiredZones = [
      {
        name: "UK Zone",
        geo_zones: [{ country_code: "gb", type: "country" }],
      },
      {
        name: "Europe Zone",
        geo_zones: [
          { country_code: "de", type: "country" },
          { country_code: "dk", type: "country" },
          { country_code: "se", type: "country" },
          { country_code: "fr", type: "country" },
          { country_code: "es", type: "country" },
          { country_code: "it", type: "country" },
          { country_code: "nl", type: "country" },
          { country_code: "be", type: "country" },
          { country_code: "at", type: "country" },
          { country_code: "ch", type: "country" },
          { country_code: "pl", type: "country" },
          { country_code: "cz", type: "country" },
        ],
      },
      {
        name: "North America Zone",
        geo_zones: [
          { country_code: "us", type: "country" },
          { country_code: "ca", type: "country" },
        ],
      },
      {
        name: "Rest of World Zone",
        geo_zones: [
          { country_code: "au", type: "country" },
          { country_code: "nz", type: "country" },
          { country_code: "jp", type: "country" },
          { country_code: "cn", type: "country" },
          { country_code: "in", type: "country" },
          { country_code: "br", type: "country" },
          { country_code: "za", type: "country" },
          { country_code: "mx", type: "country" },
          { country_code: "ar", type: "country" },
          { country_code: "ru", type: "country" },
        ],
      },
    ];

    // Create missing service zones
    for (const desiredZone of desiredZones) {
      const existingZone = existingZones.find(z => z.name === desiredZone.name);
      
      if (existingZone) {
        console.log(`⏭️ Zone already exists: ${desiredZone.name}`);
        continue;
      }

      console.log(`Creating zone: ${desiredZone.name}`);
      
      // Generate a proper ID for the service zone using UUID
      const zoneId = `serzo_${uuidv4().replace(/-/g, '')}`;
      
      // Create the service zone
      await client.query(`
        INSERT INTO service_zone (id, name, fulfillment_set_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [zoneId, desiredZone.name, mainFulfillmentSetId]);

      // Create geo zones
      for (const geoZone of desiredZone.geo_zones) {
        const geoZoneId = `geo_${uuidv4().replace(/-/g, '')}`;
        if (geoZone.type === "all") {
          await client.query(`
            INSERT INTO geo_zone (id, type, country_code, service_zone_id, created_at, updated_at)
            VALUES ($1, 'all', NULL, $2, NOW(), NOW())
          `, [geoZoneId, zoneId]);
        } else {
          await client.query(`
            INSERT INTO geo_zone (id, type, country_code, service_zone_id, created_at, updated_at)
            VALUES ($1, 'country', $2, $3, NOW(), NOW())
          `, [geoZoneId, geoZone.country_code, zoneId]);
        }
      }

      console.log(`✅ Created zone: ${desiredZone.name} (${zoneId})`);
    }

    console.log("\n=== CONSOLIDATION COMPLETE ===");
    console.log("Next steps:");
    console.log("1. Add shipping options to the new zones");
    console.log("2. Add Veeqo metadata to the shipping options");

  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
