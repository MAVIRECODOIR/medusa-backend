require('dotenv').config();

async function fixVeeqoPrices() {
  const VEEQO_API_KEY = process.env.VEEQO_API_KEY;
  
  if (!VEEQO_API_KEY) {
    console.error('VEEQO_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log("=== FIXING VEEQO DELIVERY METHOD PRICES ===");

  // Fetch all delivery methods from Veeqo
  const response = await fetch('https://api.veeqo.com/delivery_methods', {
    headers: {
      'x-api-key': VEEQO_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  console.log(`Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch delivery methods from Veeqo');
    console.error(`Error: ${errorText}`);
    process.exit(1);
  }

  const deliveryMethods = await response.json();
  console.log(`Found ${deliveryMethods.length} delivery methods in Veeqo`);

  // Update each delivery method price (convert from cents to base currency)
  for (const method of deliveryMethods) {
    const currentPrice = Number(method.cost);
    const correctedPrice = currentPrice / 100;

    console.log(`\nUpdating: ${method.name}`);
    console.log(`  Current price: £${currentPrice.toFixed(2)}`);
    console.log(`  Corrected price: £${correctedPrice.toFixed(2)}`);

    const updateResponse = await fetch(`https://api.veeqo.com/delivery_methods/${method.id}`, {
      method: 'PUT',
      headers: {
        'x-api-key': VEEQO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivery_method: {
          name: method.name,
          cost: correctedPrice,
        },
      }),
    });

    if (updateResponse.ok) {
      console.log(`  ✅ Updated successfully`);
    } else {
      console.error(`  ❌ Failed to update: ${updateResponse.statusText}`);
    }
  }

  console.log("\n=== PRICE FIX COMPLETE ===");
}

fixVeeqoPrices().catch(e => { console.error(e); process.exit(1); });
