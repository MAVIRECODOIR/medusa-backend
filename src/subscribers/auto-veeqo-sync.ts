import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function autoVeeqoSyncHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const data = event.data as any;
  if (!data?.id) return;

  try {
    const { syncProductToVeeqoWorkflow } = await import(
      "medusa-plugin-veeqo/workflows/product"
    ).catch(() => ({ syncProductToVeeqoWorkflow: null }));

    if (!syncProductToVeeqoWorkflow) {
      return;
    }

    await syncProductToVeeqoWorkflow(container).run({ input: data.id });
    logger.info(`auto-veeqo-sync: Synced product ${data.id} to Veeqo`);
  } catch (e: any) {
    if (e.message?.includes?.("already")) {
      logger.debug(`auto-veeqo-sync: Product ${data.id} already in Veeqo`);
    } else {
      logger.error(`auto-veeqo-sync: Failed for product ${data.id}: ${e.message}`);
    }
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
