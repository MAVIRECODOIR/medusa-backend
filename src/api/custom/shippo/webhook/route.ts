import { NextResponse } from "next/server";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const logger = (global as any)[ContainerRegistrationKeys.LOGGER];

    logger.info(`[Shippo Webhook] Received event: ${body.event || "unknown"}`);
    logger.info(`[Shippo Webhook] Data: ${JSON.stringify(body, null, 2)}`);

    // Handle different Shippo webhook events
    switch (body.event) {
      case "transaction_created":
        logger.info(`[Shippo Webhook] Transaction created: ${body.object_id}`);
        break;
      case "transaction_updated":
        logger.info(`[Shippo Webhook] Transaction updated: ${body.object_id}`);
        break;
      case "track_updated":
        logger.info(`[Shippo Webhook] Tracking updated for: ${body.tracking_number || body.object_id}`);
        logger.info(`[Shippo Webhook] Tracking status: ${body.tracking_status?.status || "unknown"}`);
        break;
      case "batch_created":
        logger.info(`[Shippo Webhook] Batch created: ${body.object_id}`);
        break;
      case "batch_updated":
        logger.info(`[Shippo Webhook] Batch updated: ${body.object_id}`);
        break;
      default:
        logger.info(`[Shippo Webhook] Unhandled event type: ${body.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Shippo Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
