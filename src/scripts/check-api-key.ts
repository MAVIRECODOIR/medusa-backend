import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function checkApiKey({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: apiKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type", "revoked_at", "sales_channels.id", "sales_channels.name"],
  });

  for (const ak of apiKeys) {
    if (ak.type === "publishable") {
      logger.info(`${ak.title} (${ak.token?.substring(0, 20)}...): ${ak.sales_channels?.length || 0} sales channel(s)`);
      for (const sc of (ak.sales_channels || []) as any[]) {
        if (sc) logger.info(`  → ${sc.name} (${sc.id})`);
      }
    }
  }
}
