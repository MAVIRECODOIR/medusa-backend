import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function handleShippoFulfillmentCreated({ event, container }: SubscriberArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const shippoService = container.resolve("shippo") as any;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const remoteLink = container.resolve("remoteLink") as any;
  const productModuleService = container.resolve(Modules.PRODUCT);

  const fulfillmentId = (event.data as any)?.id;
  if (!fulfillmentId) return;

  try {
    // Get fulfillment details
    const fulfillmentResult = await query.graph({
      entity: "fulfillment",
      fields: ["id", "provider_id", "data", "items.*", "location_id"],
      filters: { id: fulfillmentId },
    });

    const fulfillment = fulfillmentResult.data?.[0] as Record<string, any> | undefined;
    if (!fulfillment) {
      logger.warn(`[shippo-fulfillment] Fulfillment ${fulfillmentId} not found`);
      return;
    }

    // Skip if already processed
    const fulfillmentData = (fulfillment.data || {}) as Record<string, any>;
    if (fulfillmentData.shippo_label_created) {
      logger.info(`[shippo-fulfillment] Label already created for fulfillment ${fulfillmentId}`);
      return;
    }

    // Get linked order
    const links = await remoteLink.resolve("fulfillment", fulfillmentId, "order");
    if (!links?.length) {
      logger.warn(`[shippo-fulfillment] No linked order for fulfillment ${fulfillmentId}`);
      return;
    }

    const orderId = links[0].order_id || links[0].id;
    if (!orderId) {
      logger.warn(`[shippo-fulfillment] No order_id in link for fulfillment ${fulfillmentId}`);
      return;
    }

    // Get order details with shipping address
    const orderResult = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "currency_code",
        "shipping_address.*",
        "items.*",
        "region.*",
      ],
      filters: { id: orderId },
    });

    const order = orderResult.data?.[0] as Record<string, any> | undefined;
    if (!order) {
      logger.warn(`[shippo-fulfillment] Order ${orderId} not found`);
      return;
    }

    const shippingAddress = order.shipping_address;
    if (!shippingAddress) {
      logger.warn(`[shippo-fulfillment] No shipping address for order ${orderId}`);
      return;
    }

    // Get account address from Shippo (sender address)
    const accountAddress = await shippoService.getAccountAddress();
    if (!accountAddress) {
      logger.warn(`[shippo-fulfillment] No account address configured in Shippo`);
      return;
    }

    // Build parcel data from order items
    const parcels: any[] = [];
    let totalWeight = 0;

    for (const item of order.items || []) {
      // Get product variant to get weight and dimensions
      const variant = await productModuleService.retrieveProductVariant(item.variant_id, {
        select: ["id", "weight", "length", "width", "height", "metadata"],
      });

      const weight = variant.weight || 0.5; // Default to 0.5kg if not set
      const length = variant.length || "10";
      const width = variant.width || "10";
      const height = variant.height || "5";

      totalWeight += weight * item.quantity;

      parcels.push({
        length: String(length),
        width: String(width),
        height: String(height),
        distanceUnit: "cm",
        weight: String(weight * item.quantity),
        massUnit: "kg",
      });
    }

    // If no parcels, create default
    if (parcels.length === 0) {
      parcels.push({
        length: "10",
        width: "10",
        height: "5",
        distanceUnit: "cm",
        weight: "0.5",
        massUnit: "kg",
      });
    }

    // Determine if international shipment
    const isInternational = shippingAddress.country_code?.toUpperCase() !== "GB";
    const countryCode = shippingAddress.country_code || "GB";

    // Build shipment data
    const shipmentData: any = {
      addressFrom: {
        name: accountAddress.name || "Mavire Codoir",
        street1: accountAddress.street1,
        city: accountAddress.city,
        state: accountAddress.state,
        zip: accountAddress.zip,
        country: accountAddress.country || "GB",
        phone: accountAddress.phone || "+44 20 7123 4567",
      },
      addressTo: {
        name: `${shippingAddress.first_name} ${shippingAddress.last_name}`.trim(),
        street1: shippingAddress.address_1,
        street2: shippingAddress.address_2 || "",
        city: shippingAddress.city,
        state: shippingAddress.province || "",
        zip: shippingAddress.postal_code,
        country: countryCode,
        phone: shippingAddress.phone || "",
      },
      parcels: parcels,
      async: false,
    };

    // Add customs declaration for international shipments
    if (isInternational) {
      const customsItems: any[] = [];

      for (const item of order.items || []) {
        const variant = await productModuleService.retrieveProductVariant(item.variant_id, {
          select: ["id", "metadata"],
        });

        const hsCode = variant.metadata?.hs_code || "";
        const originCountry = variant.metadata?.origin_country || "GB";

        customsItems.push({
          description: item.title || "Product",
          quantity: item.quantity,
          netWeight: String((variant.weight || 0.5) * item.quantity),
          massUnit: "kg",
          valueAmount: String(item.unit_price / 100),
          valueCurrency: order.currency_code,
          originCountry: originCountry,
          harmonizedCode: hsCode,
        });
      }

      shipmentData.customsDeclaration = {
        contentsType: "MERCHANDISE",
        nonDeliveryOption: "RETURN",
        certify: true,
        certifySigner: "Mavire Codoir",
        items: customsItems,
      };
    }

    logger.info(`[shippo-fulfillment] Creating shipment for order ${orderId} (${isInternational ? 'international' : 'domestic'})`);

    // Create shipment and get rates
    const shipment = await shippoService.shippoClient.shipments.create(shipmentData);

    if (!shipment.rates || shipment.rates.length === 0) {
      logger.warn(`[shippo-fulfillment] No rates available for order ${orderId}`);
      return;
    }

    // Select the best rate (cheapest for now)
    const selectedRate = shipment.rates.reduce((best: any, current: any) => {
      return (current.amount < best.amount) ? current : best;
    });

    logger.info(`[shippo-fulfillment] Selected rate: ${selectedRate.provider} ${selectedRate.servicelevel?.name} (${selectedRate.amount} ${selectedRate.currency})`);

    // Create label
    const label = await shippoService.createLabel(selectedRate.objectId);

    logger.info(`[shippo-fulfillment] Label created: ${label.tracking_number}`);

    // Update fulfillment with Shippo metadata
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
    await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
      data: {
        ...fulfillmentData,
        shippo_label_created: true,
        shippo_label_url: label.label_url,
        shippo_tracking_number: label.tracking_number,
        shippo_tracking_url: label.tracking_url_provider,
        shippo_rate_amount: selectedRate.amount,
        shippo_rate_currency: selectedRate.currency,
        shippo_carrier: selectedRate.provider,
        shippo_service_level: selectedRate.servicelevel?.name,
        carrier: selectedRate.provider, // For email notification
      },
    });

    logger.info(`[shippo-fulfillment] Fulfillment ${fulfillmentId} updated with Shippo tracking info`);
  } catch (error: any) {
    logger.error(`[shippo-fulfillment] Failed for fulfillment ${fulfillmentId}: ${error.message}`);
    if (error.cause) {
      logger.error(`Cause: ${JSON.stringify(error.cause, null, 2)}`);
    }
  }
}

export const config: SubscriberConfig = {
  event: "fulfillment.created",
};
