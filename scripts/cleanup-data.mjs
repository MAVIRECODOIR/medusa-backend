import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:POjtaghtBYdLqaevBweZxtPuRMBzclAz@reseau.proxy.rlwy.net:45985/railway',
  ssl: { rejectUnauthorized: false }
});
await client.connect();

const now = new Date().toISOString();
console.log(`=== CLEANUP at ${now} ===`);

// 1) Identify old useless fulfillment set
const [oldFs] = (await client.query("SELECT id, name FROM fulfillment_set WHERE name = 'Main Warehouse - London shipping' AND deleted_at IS NULL")).rows;
if (!oldFs) { console.log('\nOld fulfillment set already gone — nothing to clean'); process.exit(0); }
console.log(`\nFound: ${oldFs.name} (${oldFs.id})`);

// 2) Its service zones
const oldZones = await client.query("SELECT id, name FROM service_zone WHERE fulfillment_set_id = $1 AND deleted_at IS NULL", [oldFs.id]);
console.log(`Service zones: ${oldZones.rowCount}`);
for (const z of oldZones.rows) console.log(`  ${z.name} (${z.id})`);

// 3) Soft-delete old zone geo_zones
for (const z of oldZones.rows) {
  const r = await client.query("UPDATE geo_zone SET deleted_at = $1 WHERE service_zone_id = $2 AND deleted_at IS NULL", [now, z.id]);
  if (r.rowCount > 0) console.log(`  Geo zones for ${z.name}: ${r.rowCount} soft-deleted`);
}

// 4) Soft-delete old service zones
const delSz = await client.query("UPDATE service_zone SET deleted_at = $1 WHERE fulfillment_set_id = $2 AND deleted_at IS NULL", [now, oldFs.id]);
console.log(`Service zones soft-deleted: ${delSz.rowCount}`);

// 5) Soft-delete link in location_fulfillment_set
const delLink = await client.query("UPDATE location_fulfillment_set SET deleted_at = $1 WHERE fulfillment_set_id = $2 AND deleted_at IS NULL", [now, oldFs.id]);
console.log(`Location links soft-deleted: ${delLink.rowCount}`);

// 6) Soft-delete old fulfillment set
const delFs = await client.query("UPDATE fulfillment_set SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL", [now, oldFs.id]);
console.log(`Fulfillment set soft-deleted: ${oldFs.name}`);

// 7) Delete duplicate stock locations (the extras created by ensure-defaults)
const dupes = await client.query(`
  SELECT id, name, created_at FROM stock_location 
  WHERE name IN ('Main Warehouse - London', 'European Warehouse - Amsterdam')
  ORDER BY name, created_at
`);
console.log(`\nDuplicate stock locations: ${dupes.rowCount}`);
for (const r of dupes.rows) {
  if (r.id === 'sloc_01KV91SSG3YGQNVS9H85E1X2D6' || r.id === 'sloc_eur_amsterdam') {
    console.log(`  KEEP: ${r.name} (${r.id})`);
  } else {
    // Soft-delete links first
    const links = await client.query("UPDATE location_fulfillment_set SET deleted_at = $1 WHERE stock_location_id = $2 AND deleted_at IS NULL", [now, r.id]);
    if (links.rowCount > 0) console.log(`  Deleted ${links.rowCount} link(s) for ${r.name} (${r.id})`);
    await client.query("UPDATE stock_location SET deleted_at = $1 WHERE id = $2", [now, r.id]);
    console.log(`  DELETED: ${r.name} (${r.id})`);
  }
}

// 8) Fix PayPal currency: EUR → GBP
const pSettings = await client.query("SELECT id, data FROM paypal_settings");
if (pSettings.rowCount > 0) {
  console.log('\nPayPal settings:');
  for (const r of pSettings.rows) {
    const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    const oldCur = d.api_details?.currency_code;
    if (oldCur && oldCur !== 'GBP') {
      d.api_details.currency_code = 'GBP';
      await client.query("UPDATE paypal_settings SET data = $1 WHERE id = $2", [JSON.stringify(d), r.id]);
      console.log(`  ${r.id}: fixed currency ${oldCur} → GBP`);
    } else {
      console.log(`  ${r.id}: currency already ${oldCur}, ok`);
    }
  }
}

// Verify
console.log('\n=== VERIFY ===');
const activeFs = await client.query("SELECT id, name FROM fulfillment_set WHERE deleted_at IS NULL ORDER BY name");
console.log('Active fulfillment sets:');
for (const r of activeFs.rows) console.log(`  ${r.name} (${r.id})`);

const activeLocs = await client.query("SELECT id, name FROM stock_location WHERE deleted_at IS NULL ORDER BY name");
console.log('Active stock locations:');
for (const r of activeLocs.rows) console.log(`  ${r.name} (${r.id})`);

const verifyPaypal = await client.query("SELECT id, data->'api_details'->>'currency_code' as currency FROM paypal_settings");
console.log('PayPal currency:', verifyPaypal.rows[0]?.currency);

await client.end();
console.log('\nDone.');
