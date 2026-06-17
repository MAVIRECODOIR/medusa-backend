import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

// ─── COLLECTIONS HANDLES ─────────────────────────────────────────
const COLLECTIONS = [
  // Men
  "men", "men-outerwear", "men-jackets", "men-shirts", "men-t-shirts",
  "men-denim", "men-knitwear", "men-trousers", "men-new-arrivals", "men-new",
  // Women
  "women", "women-outerwear", "women-dresses", "women-tops",
  "women-knitwear", "women-trousers", "women-skirts", "women-denim", "women-new-arrivals", "women-new",
  // Unisex
  "unisex", "unisex-outerwear", "unisex-knitwear",
  // Accessories
  "accessories", "accessories-bags", "accessories-scarves", "accessories-hats", "accessories-belts",
  // Archive
  "archive",
]

export default async function setupCollections({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModuleService = container.resolve(Modules.PRODUCT)

  // Ensure publishable API key is linked to a sales channel
  const { data: apiKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token"],
    filters: { type: "publishable" },
  })

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  if (apiKeys.length > 0 && salesChannels.length > 0) {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    for (const key of apiKeys) {
      try {
        await link.create({
          [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannels[0].id },
          [Modules.API_KEY]: { api_key_id: key.id },
        })
        logger.info(`✅ API key "${key.title}" linked to sales channel "${salesChannels[0].name}"`)
      } catch {
        logger.info(`⏭️ API key "${key.title}" already linked`)
      }
    }
  }

  // Create collections
  const { data: existing } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle", "title"],
  })

  const existingHandles = new Set(existing.map((c: any) => c.handle))

  let created = 0
  let skipped = 0

  for (const handle of COLLECTIONS) {
    if (existingHandles.has(handle)) {
      skipped++
      continue
    }
    const title = handle
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
    await productModuleService.createProductCollections([
      { title, handle } as any,
    ])
    logger.info(`✅ Created collection: "${title}" (${handle})`)
    created++
  }

  logger.info(`\n📋 Complete: ${created} created, ${skipped} skipped`)
}
