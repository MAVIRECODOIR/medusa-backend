require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Define Veeqo delivery method IDs for each shipping option
    const veeqoDeliveryMethodIds: Record<string, number> = {
      "Complimentary Standard Delivery": 2026270,
      "Express Delivery": 2026269,
      "International Delivery": 2026273,
      "International Standard Delivery": 2026272,
    };

    // Get all shipping options
    const { rows: shippingOptions } = await client.query(`
      SELECT so.id, so.name, so.metadata
      FROM shipping_option so
      WHERE so.deleted_at IS NULL
      ORDER BY so.name
    `);

    console.log("=== ADDING VEEQO METADATA TO SHIPPING OPTIONS ===");

    for (const option of shippingOptions) {
      const metadata = option.metadata || {};
      const veeqoId = veeqoDeliveryMethodIds[option.name];

      if (!veeqoId) {
        console.log(`⏭️ No Veeqo ID configured for: ${option.name}`);
        continue;
      }

      if (metadata.veeqo_delivery_method_id) {
        console.log(`⏭️ Already has Veeqo ID: ${option.name} (${metadata.veeqo_delivery_method_id})`);
        continue;
      }

      // Update the shipping option with Veeqo metadata
      const updatedMetadata = {
        ...metadata,
        veeqo_delivery_method_id: veeqoId,
      };

      await client.query(
        `UPDATE shipping_option SET metadata = $1 WHERE id = $2`,
        [JSON.stringify(updatedMetadata), option.id]
      );

      console.log(`✅ Added Veeqo ID to: ${option.name} (${veeqoId})`);
    }

    console.log("=== FINISHED ADDING VEEQO METADATA ===");
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
