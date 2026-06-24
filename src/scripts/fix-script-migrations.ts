import { MedusaContainer } from "@medusajs/medusa"
import { Client } from "pg"

export default async function fixScriptMigrations(container: MedusaContainer) {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  
  const client = new Client(databaseUrl)
  await client.connect()
  
  try {
    // Drop the existing table and recreate it with proper schema
    await client.query(`DROP TABLE IF EXISTS script_migrations CASCADE`)
    
    await client.query(`
      CREATE TABLE script_migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        script_name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        finished_at TIMESTAMP WITH TIME ZONE
      )
    `)
    
    console.log("Fixed script_migrations table schema")
  } finally {
    await client.end()
  }
}
