import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function fixHeritageSku({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "title"],
    filters: { product_id: "prod_01KV7HB95CK0XHR9GKPM8PZW9D" },
  });

  for (const v of variants) {
    if (!v.sku) {
      await productModule.updateProductVariants(v.id, { sku: `HERITAGE-TEE-${v.id.slice(-6)}` });
      logger.info(`  Set SKU for variant ${v.title || v.id}`);
    }
  }

  logger.info("Done");
}
