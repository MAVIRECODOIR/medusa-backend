require('dotenv').config();
const { Client } = require("pg");
const { v4: uuidv4 } = require("uuid");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("=== FIXING GEO ZONES ===");

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

    // Get service zones
    const { rows: serviceZones } = await client.query(`
      SELECT id, name
      FROM service_zone
      WHERE fulfillment_set_id = $1 AND deleted_at IS NULL
      ORDER BY name
    `, [mainFulfillmentSetId]);

    console.log(`Service zones: ${serviceZones.length}`);
    for (const zone of serviceZones) {
      console.log(`  - ${zone.name} (${zone.id})`);
    }

    // Fix Europe Zone - add European countries
    const europeZone = serviceZones.find(z => z.name === "Europe Zone");
    if (europeZone) {
      console.log("\n=== FIXING EUROPE ZONE ===");
      
      // Delete existing geo zones
      await client.query(`
        DELETE FROM geo_zone
        WHERE service_zone_id = $1
      `, [europeZone.id]);

      // Add European countries
      const europeanCountries = [
        "de", "dk", "se", "fr", "es", "it", "nl", "be", "at", "ch", "pl", "cz"
      ];

      for (const countryCode of europeanCountries) {
        const geoZoneId = `geo_${uuidv4().replace(/-/g, '')}`;
        await client.query(`
          INSERT INTO geo_zone (id, type, country_code, service_zone_id, created_at, updated_at)
          VALUES ($1, 'country', $2, $3, NOW(), NOW())
        `, [geoZoneId, countryCode, europeZone.id]);
      }

      console.log(`✅ Added ${europeanCountries.length} European countries`);
    }

    // Fix Rest of World Zone - add countries not covered by other zones
    const restOfWorldZone = serviceZones.find(z => z.name === "Rest of World Zone");
    if (restOfWorldZone) {
      console.log("\n=== FIXING REST OF WORLD ZONE ===");
      
      // Delete existing geo zones
      await client.query(`
        DELETE FROM geo_zone
        WHERE service_zone_id = $1
      `, [restOfWorldZone.id]);

      // Add countries not covered by other zones (major countries)
      const restOfWorldCountries = [
        "au", "nz", "jp", "cn", "in", "br", "za", "mx", "ar", "ru", "kr", "sg", "my", "th", "vn", "id", "ph", "hk", "tw", "ae", "sa", "eg", "ng", "ke", "za"
      ];

      for (const countryCode of restOfWorldCountries) {
        const geoZoneId = `geo_${uuidv4().replace(/-/g, '')}`;
        await client.query(`
          INSERT INTO geo_zone (id, type, country_code, service_zone_id, created_at, updated_at)
          VALUES ($1, 'country', $2, $3, NOW(), NOW())
        `, [geoZoneId, countryCode, restOfWorldZone.id]);
      }

      console.log(`✅ Added ${restOfWorldCountries.length} Rest of World countries`);
    }

    // Verify final state
    const { rows: finalZones } = await client.query(`
      SELECT sz.name, COUNT(gz.id) as geo_zone_count
      FROM service_zone sz
      LEFT JOIN geo_zone gz ON gz.service_zone_id = sz.id
      WHERE sz.fulfillment_set_id = $1 AND sz.deleted_at IS NULL
      GROUP BY sz.id, sz.name
      ORDER BY sz.name
    `, [mainFulfillmentSetId]);

    console.log("\n=== FINAL GEO ZONE COUNTS ===");
    for (const row of finalZones) {
      console.log(`  ${row.name}: ${row.geo_zone_count} geo zones`);
    }

    console.log("\n=== GEO ZONES FIXED ===");

  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
