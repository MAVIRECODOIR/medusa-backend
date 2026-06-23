import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

// Common HS codes for clothing (Harmonized System)
const CLOTHING_HS_CODES: Record<string, string> = {
  // T-shirts, singlets and other vests
  "tee": "6109",
  "t-shirt": "6109",
  "tshirt": "6109",
  // Shirts, blouses and shirt-blouses
  "shirt": "6105",
  "blouse": "6106",
  // Trousers, bib and brace overalls
  "trousers": "6203",
  "pants": "6203",
  "jeans": "6203",
  "denim": "6203",
  // Jackets and blazers
  "jacket": "6201",
  "blazer": "6201",
  "outerwear": "6201",
  // Dresses
  "dress": "6204",
  // Skirts
  "skirt": "6204",
  // Knitted or crocheted clothing
  "knitwear": "6110",
  "sweater": "6110",
  "pullover": "6110",
  "cardigan": "6110",
};

export default async function addCustomsData({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  try {
    // Get all product variants
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "title", "sku", "origin_country", "hs_code", "product.title", "product.handle"],
    });

    console.log(`Found ${variants.length} product variants`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const variant of variants) {
      const productTitle = variant.product?.title?.toLowerCase() || "";
      const productHandle = variant.product?.handle?.toLowerCase() || "";
      const variantTitle = variant.title?.toLowerCase() || "";

      // Determine HS code based on product name
      let hsCode = variant.hs_code;
      if (!hsCode) {
        for (const [keyword, code] of Object.entries(CLOTHING_HS_CODES)) {
          if (productTitle.includes(keyword) || productHandle.includes(keyword) || variantTitle.includes(keyword)) {
            hsCode = code;
            break;
          }
        }
        // Default to general clothing code if no match
        if (!hsCode) {
          hsCode = "6203"; // General trousers/pants
        }
      }

      // Set origin country to GB if not set
      const originCountry = variant.origin_country || "gb";

      // Update if needed
      if (!variant.hs_code || !variant.origin_country) {
        await productModuleService.updateProductVariants(variant.id, {
          hs_code: hsCode,
          origin_country: originCountry,
        } as any);
        console.log(`✅ Updated ${variant.sku}: HS Code=${hsCode}, Origin=${originCountry}`);
        updatedCount++;
      } else {
        console.log(`⏭️ Skipped ${variant.sku}: Already has customs data`);
        skippedCount++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Updated: ${updatedCount} variants`);
    console.log(`Skipped: ${skippedCount} variants`);
    console.log(`Total: ${variants.length} variants`);

  } catch (e: any) {
    logger.error(`Error: ${e.message}`);
  }
}
