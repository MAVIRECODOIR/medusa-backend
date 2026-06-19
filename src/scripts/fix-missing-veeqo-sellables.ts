import { MedusaError } from "@medusajs/framework/utils"

export default async function fixMissingVeeqoSellables({ container }) {
  const query = container.resolve("query")
  const veeqoService = container.resolve("veeqo")

  // 1. Find products with Veeqo links but missing variant sellable links
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "veeqo_product.veeqo_product_id",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.veeqo_sellable.veeqo_sellable_id",
    ],
  })

  for (const product of products) {
    const veeqoProductId = product.veeqo_product?.veeqo_product_id
    if (!veeqoProductId) {
      continue
    }

    const missing = product.variants.filter((v) => !v.veeqo_sellable?.veeqo_sellable_id && v.sku)
    if (missing.length === 0) {
      console.log(`${product.title}: all ${product.variants.length} variants linked ✓`)
      continue
    }

    console.log(`\n${product.title} (Veeqo ID: ${veeqoProductId})`)
    console.log(`  ${missing.length}/${product.variants.length} variants missing sellable links:`)
    for (const v of missing) {
      console.log(`    ${v.title} (SKU: ${v.sku})`)
    }

    // 2. Fetch current sellables from Veeqo
    const veeqoProduct = await veeqoService.fetchProduct(veeqoProductId)
    console.log(`  Veeqo returned ${veeqoProduct.sellables?.length ?? 0} sellables`)

    const sellablesBySku = {}
    for (const s of veeqoProduct.sellables || []) {
      sellablesBySku[s.sku_code?.toUpperCase()] = s
      console.log(`    Veeqo sellable: ${s.id} SKU: ${s.sku_code}`)
    }

    // 3. For each missing variant, create the link
    for (const variant of missing) {
      const sku = variant.sku.toUpperCase()
      const sellable = sellablesBySku[sku]

      if (sellable) {
        try {
          await veeqoService.createVeeqoSellables({
            product_variant_id: variant.id,
            veeqo_sellable_id: sellable.id,
          })
          console.log(`  ✓ ${variant.title} → veeqo_sellable_id: ${sellable.id}`)
        } catch (err) {
          console.log(`  ✗ ${variant.title}: ${err.message}`)
        }
      } else {
        console.log(`  ? ${variant.title}: no sellable with SKU ${variant.sku} in Veeqo`)
      }
    }
  }

  console.log("\nDone!")
}
