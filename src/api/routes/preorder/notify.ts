import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// Import the same storage from register.ts
const preorderRegistrations: Map<string, any[]> = new Map();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { product_id } = req.body as any;

    if (!product_id) {
      return res.status(400).json({
        error: "Missing required field: product_id",
      });
    }

    const registrations = preorderRegistrations.get(product_id) || [];
    
    if (registrations.length === 0) {
      return res.status(404).json({
        error: "No pending registrations found for this product",
      });
    }

    // Update status to notified
    const updated = registrations.map((reg) => ({
      ...reg,
      status: "notified" as const,
      notified_at: new Date().toISOString(),
    }));

    preorderRegistrations.set(product_id, updated);

    // Send email notifications using Resend
    const notificationService = req.scope.resolve("notificationService") as any;
    
    for (const registration of updated) {
      try {
        await notificationService.send({
          to: registration.customer_email,
          subject: "Product Available for Pre-Order - MAVIRE",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Great News!</h2>
              <p>The product you registered interest in is now available for pre-order.</p>
              <p>As one of the first to register, you have priority access to this limited release.</p>
              <p>Visit our store to complete your pre-order.</p>
              <p style="color: #666; font-size: 14px;">MAVIRE - Japanese calm, Ghanaian soul</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${registration.customer_email}:`, emailError);
      }
    }

    return res.status(200).json({
      message: `Successfully notified ${updated.length} customers`,
      notified_count: updated.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to notify customers",
      details: error.message,
    });
  }
}

export const AUTHENTICATE = true;
