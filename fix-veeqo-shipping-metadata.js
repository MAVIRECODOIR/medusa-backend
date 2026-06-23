require('dotenv').config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Show current shipping options
    const { rows: opts } = await client.query(`
      SELECT so.id, so.name, so.metadata
      FROM shipping_option so
      WHERE so.deleted_at IS NULL
      ORDER BY so.name
    `);
    console.log("=== SHIPPING OPTIONS BEFORE ===");
    for (const o of opts) {
      const metadata = o.metadata || {};
      console.log(`  ${o.name} | veeqo_delivery_method_id: ${metadata.veeqo_delivery_method_id || 'MISSING'}`);
    }

    console.log("\n=== FETCHING VEEQO DELIVERY METHODS ===");
    console.log("Fetching existing delivery methods from Veeqo API...");
    
    // Fetch delivery methods from Veeqo API
    const veeqoApiKey = process.env.VEEQO_API_KEY;
    const veeqoUrl = process.env.VEEQO_URL || 'https://api.veeqo.com';
    
    if (!veeqoApiKey) {
      console.log("ERROR: VEEQO_API_KEY environment variable not set.");
      console.log("Please set VEEQO_API_KEY to fetch existing delivery methods from Veeqo.");
      console.log("Skipping Veeqo API fetch - will require manual mapping.");
      return;
    }

    try {
      const response = await fetch(`${veeqoUrl}/delivery_methods`, {
        headers: {
          'x-api-key': veeqoApiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Veeqo API returned ${response.status}: ${response.statusText}`);
      }

      const veeqoDeliveryMethods = await response.json();
      
      console.log("\n=== EXISTING VEEQO DELIVERY METHODS ===");
      if (Array.isArray(veeqoDeliveryMethods) && veeqoDeliveryMethods.length > 0) {
        for (const method of veeqoDeliveryMethods) {
          console.log(`  ID: ${method.id} | Name: ${method.name}`);
        }
      } else {
        console.log("  No delivery methods found in Veeqo.");
        console.log("  You may need to create them first in Veeqo.");
        return;
      }

      // Create a mapping based on name similarity
      console.log("\n=== AUTO-GENERATED MAPPING ===");
      console.log("Based on name similarity, here's a suggested mapping:");
      
      const veeqoMapping = {};
      
      // Group Veeqo delivery methods by name and pick the highest ID (most recent)
      const veeqoMethodsByName = {};
      for (const method of veeqoDeliveryMethods) {
        const normalizedName = method.name.toLowerCase().trim();
        if (!veeqoMethodsByName[normalizedName] || method.id > veeqoMethodsByName[normalizedName].id) {
          veeqoMethodsByName[normalizedName] = method;
        }
      }
      
      for (const opt of opts) {
        const metadata = opt.metadata || {};
        
        // Check if it has a placeholder ID (starts with "veeqo_" and is a string)
        const hasPlaceholderId = metadata.veeqo_delivery_method_id && 
                                typeof metadata.veeqo_delivery_method_id === 'string' &&
                                metadata.veeqo_delivery_method_id.startsWith('veeqo_');
        
        if (hasPlaceholderId) {
          console.log(`  ${opt.name} -> Has placeholder ID, will replace with actual Veeqo ID`);
        } else if (metadata.veeqo_delivery_method_id) {
          console.log(`  ${opt.name} -> Already has actual Veeqo ID ${metadata.veeqo_delivery_method_id}`);
          continue;
        }

        // Try to find a matching Veeqo delivery method by name
        const normalizedName = opt.name.toLowerCase().trim();
        const matchingMethod = veeqoMethodsByName[normalizedName];

        if (matchingMethod) {
          veeqoMapping[opt.name] = matchingMethod.id;
          console.log(`  ${opt.name} -> ${matchingMethod.id} (${matchingMethod.name})`);
        } else {
          console.log(`  ${opt.name} -> NO MATCH FOUND (manual mapping required)`);
        }
      }

      console.log("\n=== CONFIRM MAPPING ===");
      console.log("Please review the mapping above and update the script if needed.");
      console.log("The script will use this mapping to update shipping option metadata.");
      
      if (Object.keys(veeqoMapping).length === 0) {
        console.log("No automatic matches found. Please manually update the veeqoMapping object.");
        return;
      }

      // Update each option with the mapped veeqo_delivery_method_id
      for (const o of opts) {
        const metadata = o.metadata || {};
        
        // Check if it has a placeholder ID (starts with "veeqo_" and is a string)
        const hasPlaceholderId = metadata.veeqo_delivery_method_id && 
                                typeof metadata.veeqo_delivery_method_id === 'string' &&
                                metadata.veeqo_delivery_method_id.startsWith('veeqo_');
        
        // Skip if already has actual Veeqo ID (not a placeholder)
        if (metadata.veeqo_delivery_method_id && !hasPlaceholderId) {
          console.log(`  Skipping ${o.name} - already has actual Veeqo ID ${metadata.veeqo_delivery_method_id}`);
          continue;
        }

        // Look for matching Veeqo ID in the mapping
        const veeqoId = veeqoMapping[o.name];
        
        if (!veeqoId) {
          console.log(`  Skipping ${o.name} - no mapping found`);
          continue;
        }
        
        // Update metadata with the actual Veeqo delivery method ID
        const updatedMetadata = {
          ...metadata,
          veeqo_delivery_method_id: veeqoId,
        };
        
        await client.query(
          `UPDATE shipping_option SET metadata = $1 WHERE id = $2`,
          [JSON.stringify(updatedMetadata), o.id]
        );
        const action = hasPlaceholderId ? "Replaced placeholder ID" : "Updated";
        console.log(`  ${action} for ${o.name} with veeqo_delivery_method_id: ${veeqoId}`);
      }

      // Show updated
      const { rows: updated } = await client.query(`
        SELECT so.id, so.name, so.metadata
        FROM shipping_option so
        WHERE so.deleted_at IS NULL
        ORDER BY so.name
      `);
      console.log("\n=== SHIPPING OPTIONS AFTER ===");
      for (const o of updated) {
        const metadata = o.metadata || {};
        console.log(`  ${o.name} | veeqo_delivery_method_id: ${metadata.veeqo_delivery_method_id}`);
      }

    } catch (apiError) {
      console.log(`ERROR fetching from Veeqo API: ${apiError.message}`);
      console.log("Please check your VEEQO_API_KEY and VEEQO_URL environment variables.");
      console.log("Falling back to manual mapping approach.");
    }

  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
