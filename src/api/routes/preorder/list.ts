import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// Import the same storage from register.ts
const preorderRegistrations: Map<string, any[]> = new Map();

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { product_id } = req.query as any;

    if (product_id) {
      // Get registrations for a specific product
      const registrations = preorderRegistrations.get(product_id) || [];
      return res.status(200).json({
        product_id,
        registrations,
        count: registrations.length,
      });
    } else {
      // Get all registrations (admin only)
      const allRegistrations: any[] = [];
      preorderRegistrations.forEach((regs) => {
        allRegistrations.push(...regs);
      });
      return res.status(200).json({
        registrations: allRegistrations,
        count: allRegistrations.length,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to retrieve pre-order registrations",
      details: error.message,
    });
  }
}

export const AUTHENTICATE = false;
