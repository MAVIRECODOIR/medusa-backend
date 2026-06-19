export default async function checkVeeqoVariants({ container }) {
  const query = container.resolve("query")
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "veeqo_product.veeqo_product_id",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.prices.amount",
      "variants.veeqo_sellable.veeqo_sellable_id",
    ],
  })
  for (const p of products) {
    console.log(`\n${p.title} (${p.id})`)
    console.log(`  Veeqo Product ID: ${p.veeqo_product?.veeqo_product_id ?? "NONE"}`)
    for (const v of p.variants) {
      const pid = v.veeqo_sellable?.veeqo_sellable_id
      console.log(
        `  ${v.title.padEnd(12)} SKU: ${(v.sku || "MISSING!").padEnd(14)} Price: ${v.prices?.[0]?.amount ?? "MISSING!"} VeeqoSellable: ${pid ?? "NONE"}`
      )
    }
  }
}
