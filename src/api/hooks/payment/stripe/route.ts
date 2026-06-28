import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import { capturePaymentWorkflow } from "@medusajs/core-flows"
import Stripe from "stripe"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const stripeApiKey = process.env.STRIPE_API_KEY
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeApiKey) {
    return res.status(500).json({ error: "STRIPE_API_KEY not configured" })
  }

  if (!stripeWebhookSecret) {
    return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET not configured" })
  }

  const stripe = new Stripe(stripeApiKey)

  const sig = req.headers["stripe-signature"] as string
  let event: Stripe.Event

  const rawBody = req.rawBody
  if (!rawBody) {
    return res.status(400).json({ error: "Raw request body not available" })
  }

  try {
    event = stripe.webhooks.constructEvent(rawBody.toString(), sig, stripeWebhookSecret)
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        await handlePaymentIntentSucceeded(event, req.scope, logger, remoteQuery)
        break
      }
      case "payment_intent.amount_capturable_updated": {
        await handlePaymentIntentAmountCapturable(event, req.scope, logger, remoteQuery)
        break
      }
      case "payment_intent.payment_failed": {
        await handlePaymentIntentPaymentFailed(event, req.scope, logger, remoteQuery)
        break
      }
      case "payment_intent.created": {
        await handlePaymentIntentCreated(event, req.scope, logger, remoteQuery)
        break
      }
      case "payment_intent.processing": {
        await handlePaymentIntentProcessing(event, req.scope, logger, remoteQuery)
        break
      }
      case "charge.succeeded": {
        await handleChargeSucceeded(event, req.scope, logger, remoteQuery)
        break
      }
      case "charge.captured": {
        await handleChargeCaptured(event, req.scope, logger, remoteQuery)
        break
      }
      case "charge.pending": {
        await handleChargePending(event, req.scope, logger, remoteQuery)
        break
      }
      case "charge.refunded": {
        await handleChargeRefunded(event, req.scope, logger, remoteQuery)
        break
      }
      case "charge.updated": {
        await handleChargeUpdated(event, req.scope, logger, remoteQuery)
        break
      }
      case "charge.dispute.created": {
        await handleChargeDisputeCreated(event, req.scope, logger, remoteQuery)
        break
      }
      case "charge.dispute.closed": {
        await handleChargeDisputeClosed(event, req.scope, logger, remoteQuery)
        break
      }
      default: {
        logger.info(`Unhandled event type: ${event.type}`)
      }
    }

    res.json({ received: true })
  } catch (err: any) {
    logger.error(`Error processing webhook ${event.type}: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
}

async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const sessionId = paymentIntent.metadata.session_id

  if (!sessionId) {
    logger.warn(`[payment_intent.succeeded] No session_id in metadata for payment intent ${paymentIntent.id}`)
    return
  }

  logger.info(`[payment_intent.succeeded] Payment intent ${paymentIntent.id} succeeded for session ${sessionId}`)

  // Find the payment collection or order associated with this session
  const query = remoteQueryObjectFromString({
    entryPoint: "payment",
    fields: [
      "id",
      "provider_id",
      "data",
      "amount",
      "captured_at",
      "payment_collection_id",
    ],
    filters: {
      "data.id": paymentIntent.id,
    },
  })

  const payments = await remoteQuery(query)
  
  if (payments.length === 0) {
    logger.warn(`[payment_intent.succeeded] No payment found for payment intent ${paymentIntent.id}`)
    // Try to find payment by session_id instead
    const sessionQuery = remoteQueryObjectFromString({
      entryPoint: "payment",
      fields: [
        "id",
        "provider_id",
        "data",
        "amount",
        "captured_at",
        "payment_collection_id",
      ],
      filters: {
        "data.session_id": sessionId,
      },
    })
    const sessionPayments = await remoteQuery(sessionQuery)
    if (sessionPayments.length > 0) {
      logger.info(`[payment_intent.succeeded] Found ${sessionPayments.length} payment(s) by session_id ${sessionId}`)
      for (const payment of sessionPayments) {
        await capturePaymentIfNotCaptured(payment, scope, logger, paymentIntent.id)
      }
    }
    return
  }

  const payment = payments[0]
  await capturePaymentIfNotCaptured(payment, scope, logger, paymentIntent.id)
}

async function capturePaymentIfNotCaptured(
  payment: any,
  scope: any,
  logger: any,
  paymentIntentId: string
) {
  // If payment is not yet captured, capture it
  if (!payment.captured_at) {
    try {
      await capturePaymentWorkflow(scope).run({
        input: {
          payment_id: payment.id,
          captured_by: "stripe_webhook",
        },
      })
      logger.info(`[payment_intent.succeeded] Captured payment ${payment.id} for payment intent ${paymentIntentId}`)
    } catch (err: any) {
      logger.error(`[payment_intent.succeeded] Failed to capture payment ${payment.id}: ${err.message}`)
      logger.error(`[payment_intent.succeeded] Error details: ${JSON.stringify(err)}`)
    }
  } else {
    logger.info(`[payment_intent.succeeded] Payment ${payment.id} already captured at ${payment.captured_at}`)
  }
}

async function handlePaymentIntentAmountCapturable(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const sessionId = paymentIntent.metadata.session_id

  if (!sessionId) {
    logger.warn(`[payment_intent.amount_capturable_updated] No session_id in metadata for payment intent ${paymentIntent.id}`)
    return
  }

  logger.info(`[payment_intent.amount_capturable_updated] Payment intent ${paymentIntent.id} is now capturable for session ${sessionId}`)
  // This event indicates the payment can be captured, but we wait for payment_intent.succeeded to actually capture
}

async function handlePaymentIntentPaymentFailed(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const sessionId = paymentIntent.metadata.session_id

  if (!sessionId) {
    logger.warn(`[payment_intent.payment_failed] No session_id in metadata for payment intent ${paymentIntent.id}`)
    return
  }

  logger.info(`[payment_intent.payment_failed] Payment intent ${paymentIntent.id} failed for session ${sessionId}`)
  
  // Find the payment and update its status
  const query = remoteQueryObjectFromString({
    entryPoint: "payment",
    fields: [
      "id",
      "provider_id",
      "data",
      "amount",
      "captured_at",
      "payment_collection_id",
    ],
    filters: {
      "data.id": paymentIntent.id,
    },
  })

  const payments = await remoteQuery(query)
  
  if (payments.length === 0) {
    logger.warn(`[payment_intent.payment_failed] No payment found for payment intent ${paymentIntent.id}`)
    return
  }

  const payment = payments[0]
  logger.info(`[payment_intent.payment_failed] Payment ${payment.id} failed for payment intent ${paymentIntent.id}`)
  // Payment status will be updated by Medusa's payment module based on the failure
}

async function handleChargeRefunded(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const charge = event.data.object as Stripe.Charge
  const sessionId = charge.metadata.session_id

  if (!sessionId) {
    logger.warn(`[charge.refunded] No session_id in metadata for charge ${charge.id}`)
    return
  }

  logger.info(`[charge.refunded] Charge ${charge.id} refunded for session ${sessionId}`)
  
  // Find the payment associated with this charge
  const query = remoteQueryObjectFromString({
    entryPoint: "payment",
    fields: [
      "id",
      "provider_id",
      "data",
      "amount",
      "captured_at",
      "payment_collection_id",
    ],
    filters: {
      "data.charge": charge.id,
    },
  })

  const payments = await remoteQuery(query)
  
  if (payments.length === 0) {
    logger.warn(`[charge.refunded] No payment found for charge ${charge.id}`)
    return
  }

  const payment = payments[0]
  logger.info(`[charge.refunded] Payment ${payment.id} associated with refunded charge ${charge.id}`)
  // Refund processing will be handled by Medusa's payment module
}

async function handlePaymentIntentCreated(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  logger.info(`[payment_intent.created] Payment intent ${paymentIntent.id} created`)
  // Log for tracking purposes
}

async function handlePaymentIntentProcessing(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  logger.info(`[payment_intent.processing] Payment intent ${paymentIntent.id} is processing`)
  // Log for tracking purposes
}

async function handleChargeSucceeded(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const charge = event.data.object as Stripe.Charge
  const sessionId = charge.metadata.session_id

  if (!sessionId) {
    logger.warn(`[charge.succeeded] No session_id in metadata for charge ${charge.id}`)
    return
  }

  logger.info(`[charge.succeeded] Charge ${charge.id} succeeded for session ${sessionId}`)
  
  // Find the payment associated with this charge and capture it
  const query = remoteQueryObjectFromString({
    entryPoint: "payment",
    fields: [
      "id",
      "provider_id",
      "data",
      "amount",
      "captured_at",
      "payment_collection_id",
    ],
    filters: {
      "data.charge": charge.id,
    },
  })

  const payments = await remoteQuery(query)
  
  if (payments.length === 0) {
    // Try finding by payment_intent
    const paymentIntentQuery = remoteQueryObjectFromString({
      entryPoint: "payment",
      fields: [
        "id",
        "provider_id",
        "data",
        "amount",
        "captured_at",
        "payment_collection_id",
      ],
      filters: {
        "data.id": charge.payment_intent,
      },
    })
    const intentPayments = await remoteQuery(paymentIntentQuery)
    
    if (intentPayments.length > 0) {
      for (const payment of intentPayments) {
        await capturePaymentIfNotCaptured(payment, scope, logger, charge.payment_intent as string)
      }
    }
    return
  }

  for (const payment of payments) {
    await capturePaymentIfNotCaptured(payment, scope, logger, charge.payment_intent as string)
  }
}

async function handleChargeCaptured(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const charge = event.data.object as Stripe.Charge
  logger.info(`[charge.captured] Charge ${charge.id} captured`)
  // Similar logic to charge.succeeded
  await handleChargeSucceeded(event, scope, logger, remoteQuery)
}

async function handleChargePending(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const charge = event.data.object as Stripe.Charge
  logger.info(`[charge.pending] Charge ${charge.id} is pending`)
  // Log for tracking purposes
}

async function handleChargeUpdated(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const charge = event.data.object as Stripe.Charge
  logger.info(`[charge.updated] Charge ${charge.id} updated`)
  // Log for tracking purposes
}

async function handleChargeDisputeCreated(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const charge = event.data.object as Stripe.Charge
  logger.warn(`[charge.dispute.created] Dispute created for charge ${charge.id}`)
  // Log for tracking purposes - may want to notify admin
}

async function handleChargeDisputeClosed(
  event: Stripe.Event,
  scope: any,
  logger: any,
  remoteQuery: any
) {
  const charge = event.data.object as Stripe.Charge
  logger.info(`[charge.dispute.closed] Dispute closed for charge ${charge.id}`)
  // Log for tracking purposes
}
