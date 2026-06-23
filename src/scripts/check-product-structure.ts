import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function checkProductStructure({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    // Check product variant structure
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "title", "sku", "metadata", "origin_country", "hs_code", "product.title"],
    });

    // Limit to first 5 for display
    const sampleVariants = variants.slice(0, 5);

    console.log("=== PRODUCT VARIANT STRUCTURE ===");
    console.log(JSON.stringify(sampleVariants, null, 2));

    // Check if metadata field exists
    if (sampleVariants.length > 0) {
      const sample = sampleVariants[0];
      console.log("\n=== SAMPLE VARIANT ===");
      console.log("Has metadata field:", "metadata" in sample);
      console.log("Metadata value:", sample.metadata);
      console.log("Has origin_country field:", "origin_country" in sample);
      console.log("Has hs_code field:", "hs_code" in sample);
    }
  } catch (e: any) {
    logger.error(`Error: ${e.message}`);
  }
}
