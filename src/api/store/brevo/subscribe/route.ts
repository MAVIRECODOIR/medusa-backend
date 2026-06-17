import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { BrevoClient } from "@getbrevo/brevo";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, firstName, lastName, listIds } = req.body as {
    email?: string;
    firstName?: string;
    lastName?: string;
    listIds?: number[];
  };

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const defaultListId = process.env.BREVO_NEWSLETTER_LIST_ID
    ? Number(process.env.BREVO_NEWSLETTER_LIST_ID)
    : undefined;

  if (!apiKey) {
    return res.status(500).json({ error: "Brevo API key not configured" });
  }

  try {
    const brevo = new BrevoClient({ apiKey });
    const targetListIds = listIds ?? (defaultListId ? [defaultListId] : undefined);

    await brevo.contacts.createContact({
      email,
      attributes: {
        FIRSTNAME: firstName || "",
        LASTNAME: lastName || "",
      },
      listIds: targetListIds,
      updateEnabled: true,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
    logger.error("Brevo subscribe failed", error);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
}
