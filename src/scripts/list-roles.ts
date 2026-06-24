import { MedusaContainer } from "@medusajs/medusa"
import { Client } from "pg"

export default async function listRoles(container: MedusaContainer) {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  
  const client = new Client(databaseUrl)
  await client.connect()
  
  try {
    const result = await client.query(
      "SELECT id, name FROM rbac_role WHERE deleted_at IS NULL"
    )
    
    console.log("Available roles:")
    result.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.id}`)
    })
  } finally {
    await client.end()
  }
}
