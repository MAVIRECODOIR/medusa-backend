import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { BrevoClient } from "@getbrevo/brevo";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, listId, reason } = req.body as {
    email?: string;
    listId?: string;
    reason?: string;
  };

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: "Brevo API key not configured" });
  }

  try {
    const brevo = new BrevoClient({ apiKey });

    const listIdsToRemove = listId ? [Number(listId)] : undefined;

    await (brevo.contacts.updateContact as any)(email, {
      listIds: [],
      unlinkListIds: listIdsToRemove,
      attributes: {
        UNSUBSCRIBE_REASON: reason || "",
        UNSUBSCRIBED_AT: new Date().toISOString(),
      },
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
    logger.error("Brevo unsubscribe failed", error);

    // If contact doesn't exist in Brevo, it's still effectively unsubscribed
    if (error?.response?.statusCode === 404) {
      return res.status(200).json({ success: true });
    }

    return res.status(500).json({ message: "Failed to unsubscribe" });
  }
}
