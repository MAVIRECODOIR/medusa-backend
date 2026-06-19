import { ExecArgs } from "@medusajs/framework/types";

export default async function deduplicateLocations({ container }: ExecArgs) {
  const { Client } = require("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Find duplicate locations
    const { rows: all } = await client.query(
      `SELECT id, name FROM stock_location WHERE deleted_at IS NULL ORDER BY name, created_at`
    );

    const groups: Record<string, typeof all> = {};
    for (const loc of all) {
      if (!groups[loc.name]) groups[loc.name] = [];
      groups[loc.name].push(loc);
    }

    const dupIds: string[] = [];
    const keepMap = new Map<string, string>();
    for (const [name, locs] of Object.entries(groups)) {
      if (locs.length > 1) {
        const keep = locs[0];
        const dups = locs.slice(1);
        dupIds.push(...dups.map((l: any) => l.id));
        for (const d of dups) keepMap.set(d.id, keep.id);
        console.log(`"${name}": keeping ${keep.id}, removing ${dups.length} duplicates`);
      }
    }

    if (dupIds.length === 0) {
      console.log("No duplicates found.");
      return;
    }

    // 2. Merge inventory levels from dup → keep
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId)!;
      const { rows: levels } = await client.query(
        `SELECT * FROM inventory_level WHERE location_id = $1`,
        [dupId]
      );

      for (const lvl of levels) {
        const { rows: existing } = await client.query(
          `SELECT id, stocked_quantity FROM inventory_level
           WHERE location_id = $1 AND inventory_item_id = $2`,
          [keepId, lvl.inventory_item_id]
        );

        if (existing.length > 0) {
          await client.query(
            `UPDATE inventory_level SET stocked_quantity = stocked_quantity + $1 WHERE id = $2`,
            [lvl.stocked_quantity, existing[0].id]
          );
        } else {
          await client.query(
            `UPDATE inventory_level SET location_id = $1 WHERE id = $2`,
            [keepId, lvl.id]
          );
        }
      }
    }

    // 3. Reassign fulfillment_set_location links
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId)!;
      const { rows: links } = await client.query(
        `SELECT fulfillment_set_id FROM fulfillment_set_location WHERE stock_location_id = $1`,
        [dupId]
      );
      for (const link of links) {
        await client.query(
          `INSERT INTO fulfillment_set_location (fulfillment_set_id, stock_location_id)
           SELECT $1, $2 WHERE NOT EXISTS (
             SELECT 1 FROM fulfillment_set_location
             WHERE fulfillment_set_id = $1 AND stock_location_id = $2
           )`,
          [link.fulfillment_set_id, keepId]
        );
      }
    }

    // 4. Reassign sales_channel_location links
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId)!;
      const { rows: links } = await client.query(
        `SELECT sales_channel_id FROM sales_channel_location WHERE stock_location_id = $1`,
        [dupId]
      );
      for (const link of links) {
        await client.query(
          `INSERT INTO sales_channel_location (sales_channel_id, stock_location_id)
           SELECT $1, $2 WHERE NOT EXISTS (
             SELECT 1 FROM sales_channel_location
             WHERE sales_channel_id = $1 AND stock_location_id = $2
           )`,
          [link.sales_channel_id, keepId]
        );
      }
    }

    // 5. Update store default_location_id
    for (const dupId of dupIds) {
      const keepId = keepMap.get(dupId)!;
      await client.query(
        `UPDATE "store" SET default_location_id = $1 WHERE default_location_id = $2`,
        [keepId, dupId]
      );
    }

    // 6. Clean up link tables for duplicate IDs
    await client.query(`DELETE FROM fulfillment_set_location WHERE stock_location_id = ANY($1::text[])`, [dupIds]);
    await client.query(`DELETE FROM sales_channel_location WHERE stock_location_id = ANY($1::text[])`, [dupIds]);
    await client.query(`DELETE FROM inventory_level WHERE location_id = ANY($1::text[])`, [dupIds]);

    // 7. Delete duplicate stock locations (CASCADE handles addresses)
    await client.query(`DELETE FROM stock_location WHERE id = ANY($1::text[])`, [dupIds]);

    console.log(`Deleted ${dupIds.length} duplicate locations.`);

    // 8. Rename any leftover "European Warehouse" to "Main Warehouse - London"
    const { rows: euWarehouses } = await client.query(
      `SELECT id FROM stock_location WHERE name = 'European Warehouse' AND deleted_at IS NULL`
    );

    if (euWarehouses.length > 0) {
      const { rows: londonLocations } = await client.query(
        `SELECT id FROM stock_location WHERE name = 'Main Warehouse - London' AND deleted_at IS NULL`
      );

      if (londonLocations.length > 0) {
        // London exists, delete European warehouses
        const euIds = euWarehouses.map((r: any) => r.id);
        await client.query(`DELETE FROM fulfillment_set_location WHERE stock_location_id = ANY($1::text[])`, [euIds]);
        await client.query(`DELETE FROM sales_channel_location WHERE stock_location_id = ANY($1::text[])`, [euIds]);
        await client.query(`DELETE FROM inventory_level WHERE location_id = ANY($1::text[])`, [euIds]);
        await client.query(`DELETE FROM stock_location WHERE id = ANY($1::text[])`, [euIds]);
        console.log(`Deleted ${euIds.length} "European Warehouse" locations (London already exists)`);
      } else {
        await client.query(
          `UPDATE stock_location SET name = 'Main Warehouse - London' WHERE name = 'European Warehouse' AND deleted_at IS NULL`
        );
        console.log(`Renamed "European Warehouse" → "Main Warehouse - London"`);
      }
    }

    // 9. Summary
    const { rows: remaining } = await client.query(
      `SELECT id, name FROM stock_location WHERE deleted_at IS NULL ORDER BY name`
    );
    console.log(`\n=== Done. ${remaining.length} locations remain ===`);
    for (const loc of remaining) {
      console.log(`  ${loc.name} (${loc.id})`);
    }
  } finally {
    await client.end();
  }
}
