import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// Simple in-memory storage for pre-order registrations (in production, use database)
const preorderRegistrations: Map<string, any[]> = new Map();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { product_id, customer_email, customer_name } = req.body as any;

    if (!product_id || !customer_email) {
      return res.status(400).json({
        error: "Missing required fields: product_id and customer_email are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Get existing registrations for this product
    const existing = preorderRegistrations.get(product_id) || [];
    
    // Check if email already registered for this product
    const alreadyRegistered = existing.some((reg: any) => reg.customer_email === customer_email);
    if (alreadyRegistered) {
      return res.status(409).json({
        error: "Email already registered for this product",
      });
    }

    // Create new registration
    const registration = {
      id: `${product_id}-${Date.now()}`,
      product_id,
      customer_email,
      customer_name: customer_name || "",
      status: "pending" as const,
      created_at: new Date().toISOString(),
    };

    // Store registration
    existing.push(registration);
    preorderRegistrations.set(product_id, existing);

    return res.status(201).json({
      message: "Pre-order interest registered successfully",
      registration,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to register pre-order interest",
      details: error.message,
    });
  }
}

export const AUTHENTICATE = false;
