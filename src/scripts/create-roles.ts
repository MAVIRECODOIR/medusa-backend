import { MedusaContainer } from "@medusajs/medusa"
import { Client } from "pg"

export default async function createRoles(container: MedusaContainer) {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  
  const client = new Client(databaseUrl)
  await client.connect()
  
  try {
    // Check if staff role exists
    const staffResult = await client.query(
      "SELECT id FROM rbac_role WHERE name = 'staff' LIMIT 1"
    )
    
    if (staffResult.rows.length === 0) {
      await client.query(`
        INSERT INTO rbac_role (id, name, description, created_at, updated_at, deleted_at)
        VALUES (
          gen_random_uuid(),
          'staff',
          'Staff role with limited permissions',
          NOW(),
          NOW(),
          NULL
        )
      `)
      console.log("Created staff role")
    } else {
      console.log("Staff role already exists")
    }
    
    // Check if manager role exists
    const managerResult = await client.query(
      "SELECT id FROM rbac_role WHERE name = 'manager' LIMIT 1"
    )
    
    if (managerResult.rows.length === 0) {
      await client.query(`
        INSERT INTO rbac_role (id, name, description, created_at, updated_at, deleted_at)
        VALUES (
          gen_random_uuid(),
          'manager',
          'Manager role with extended permissions',
          NOW(),
          NOW(),
          NULL
        )
      `)
      console.log("Created manager role")
    } else {
      console.log("Manager role already exists")
    }
    
    // Check if viewer role exists
    const viewerResult = await client.query(
      "SELECT id FROM rbac_role WHERE name = 'viewer' LIMIT 1"
    )
    
    if (viewerResult.rows.length === 0) {
      await client.query(`
        INSERT INTO rbac_role (id, name, description, created_at, updated_at, deleted_at)
        VALUES (
          gen_random_uuid(),
          'viewer',
          'Viewer role with read-only access to dashboards and reports',
          NOW(),
          NOW(),
          NULL
        )
      `)
      console.log("Created viewer role")
    } else {
      console.log("Viewer role already exists")
    }
    
    console.log("Role creation completed")
  } finally {
    await client.end()
  }
}
