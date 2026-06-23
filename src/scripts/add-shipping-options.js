require('dotenv').config();
const { Client } = require("pg");
const { v4: uuidv4 } = require("uuid");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log("=== ADDING SHIPPING OPTIONS TO MAIN WAREHOUSE - LONDON ===");

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

    // Get the default shipping profile
    const { rows: shippingProfile } = await client.query(`
      SELECT id, name
      FROM shipping_profile
      WHERE type = 'default' AND deleted_at IS NULL
      LIMIT 1
    `);

    if (shippingProfile.length === 0) {
      console.log("ERROR: Default shipping profile not found");
      return;
    }

    const shippingProfileId = shippingProfile[0].id;
    console.log(`Shipping profile: ${shippingProfile[0].name} (${shippingProfileId})`);

    // Get service zones for Main Warehouse - London
    const { rows: serviceZones } = await client.query(`
      SELECT id, name
      FROM service_zone
      WHERE fulfillment_set_id = $1 AND deleted_at IS NULL
      ORDER BY name
    `, [mainFulfillmentSetId]);

    console.log(`\nService zones: ${serviceZones.length}`);
    for (const zone of serviceZones) {
      console.log(`  - ${zone.name} (${zone.id})`);
    }

    // Define Veeqo delivery method IDs
    const veeqoDeliveryMethodIds = {
      "Complimentary Standard Delivery": 2026270,
      "Express Delivery": 2026269,
      "International Standard Delivery": 2026272,
      "International Express Delivery": 2026273,
    };

    // Define shipping options for each zone
    const zoneShippingOptions = {
      "UK Zone": [
        {
          name: "Complimentary Standard Delivery",
          price_type: "flat",
          type_label: "Standard",
          type_code: "standard",
          type_description: "Complimentary standard delivery within UK",
          prices: [
            { currency_code: "gbp", amount: 0 },
          ],
          veeqo_id: veeqoDeliveryMethodIds["Complimentary Standard Delivery"],
        },
        {
          name: "Express Delivery",
          price_type: "flat",
          type_label: "Express",
          type_code: "express",
          type_description: "Express delivery within UK",
          prices: [
            { currency_code: "gbp", amount: 800 },
          ],
          veeqo_id: veeqoDeliveryMethodIds["Express Delivery"],
        },
      ],
      "Europe Zone": [
        {
          name: "International Standard Delivery",
          price_type: "flat",
          type_label: "International Standard",
          type_code: "international-standard",
          type_description: "International standard delivery to Europe",
          prices: [
            { currency_code: "gbp", amount: 1200 },
            { currency_code: "eur", amount: 1500 },
          ],
          veeqo_id: veeqoDeliveryMethodIds["International Standard Delivery"],
        },
        {
          name: "International Express Delivery",
          price_type: "flat",
          type_label: "International Express",
          type_code: "international-express",
          type_description: "International express delivery to Europe",
          prices: [
            { currency_code: "gbp", amount: 2000 },
            { currency_code: "eur", amount: 2500 },
          ],
          veeqo_id: veeqoDeliveryMethodIds["International Express Delivery"],
        },
      ],
      "North America Zone": [
        {
          name: "International Standard Delivery",
          price_type: "flat",
          type_label: "International Standard",
          type_code: "international-standard",
          type_description: "International standard delivery to North America",
          prices: [
            { currency_code: "gbp", amount: 1800 },
            { currency_code: "usd", amount: 2500 },
          ],
          veeqo_id: veeqoDeliveryMethodIds["International Standard Delivery"],
        },
        {
          name: "International Express Delivery",
          price_type: "flat",
          type_label: "International Express",
          type_code: "international-express",
          type_description: "International express delivery to North America",
          prices: [
            { currency_code: "gbp", amount: 3000 },
            { currency_code: "usd", amount: 4000 },
          ],
          veeqo_id: veeqoDeliveryMethodIds["International Express Delivery"],
        },
      ],
      "Rest of World Zone": [
        {
          name: "International Standard Delivery",
          price_type: "flat",
          type_label: "International Standard",
          type_code: "international-standard",
          type_description: "International standard delivery worldwide",
          prices: [
            { currency_code: "gbp", amount: 2500 },
            { currency_code: "usd", amount: 3500 },
          ],
          veeqo_id: veeqoDeliveryMethodIds["International Standard Delivery"],
        },
        {
          name: "International Express Delivery",
          price_type: "flat",
          type_label: "International Express",
          type_code: "international-express",
          type_description: "International express delivery worldwide",
          prices: [
            { currency_code: "gbp", amount: 4000 },
            { currency_code: "usd", amount: 5500 },
          ],
          veeqo_id: veeqoDeliveryMethodIds["International Express Delivery"],
        },
      ],
    };

    // Add shipping options to each zone
    for (const zone of serviceZones) {
      const options = zoneShippingOptions[zone.name];
      
      if (!options) {
        console.log(`\n⏭️ No shipping options configured for zone: ${zone.name}`);
        continue;
      }

      console.log(`\n=== Adding shipping options to ${zone.name} ===`);

      for (const option of options) {
        // Check if shipping option already exists
        const { rows: existing } = await client.query(`
          SELECT id, name
          FROM shipping_option
          WHERE service_zone_id = $1 AND name = $2 AND deleted_at IS NULL
        `, [zone.id, option.name]);

        if (existing.length > 0) {
          console.log(`⏭️ Already exists: ${option.name}`);
          continue;
        }

        // Generate IDs
        const shippingOptionId = `so_${uuidv4().replace(/-/g, '')}`;
        const shippingOptionTypeId = `sotype_${uuidv4().replace(/-/g, '')}`;

        // Create shipping option type
        await client.query(`
          INSERT INTO shipping_option_type (id, label, description, code, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [shippingOptionTypeId, option.type_label, option.type_description, option.type_code]);

        // Create shipping option
        await client.query(`
          INSERT INTO shipping_option (id, name, price_type, service_zone_id, shipping_profile_id, 
                                       shipping_option_type_id, metadata, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          shippingOptionId,
          option.name,
          option.price_type,
          zone.id,
          shippingProfileId,
          shippingOptionTypeId,
          JSON.stringify({ veeqo_delivery_method_id: option.veeqo_id }),
        ]);

        // Create prices
        for (const price of option.prices) {
          const priceSetId = `pset_${uuidv4().replace(/-/g, '')}`;
          const priceId = `price_${uuidv4().replace(/-/g, '')}`;
          const shippingOptionPriceSetId = `sops_${uuidv4().replace(/-/g, '')}`;

          // Create price set
          await client.query(`
            INSERT INTO price_set (id, created_at, updated_at)
            VALUES ($1, NOW(), NOW())
          `, [priceSetId]);

          // Create price
          await client.query(`
            INSERT INTO price (id, currency_code, amount, raw_amount, price_set_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          `, [priceId, price.currency_code, price.amount, JSON.stringify({ value: price.amount }), priceSetId]);

          // Link price set to shipping option
          await client.query(`
            INSERT INTO shipping_option_price_set (id, shipping_option_id, price_set_id, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
          `, [shippingOptionPriceSetId, shippingOptionId, priceSetId]);
        }

        // Create rules
        const ruleId = `rule_${uuidv4().replace(/-/g, '')}`;
        await client.query(`
          INSERT INTO shipping_option_rule (id, attribute, value, operator, shipping_option_id, created_at, updated_at)
          VALUES ($1, 'enabled_in_store', 'true', 'eq', $2, NOW(), NOW())
        `, [ruleId, shippingOptionId]);

        console.log(`✅ Added: ${option.name} (Veeqo ID: ${option.veeqo_id})`);
      }
    }

    console.log("\n=== SHIPPING OPTIONS ADDED SUCCESSFULLY ===");

  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
