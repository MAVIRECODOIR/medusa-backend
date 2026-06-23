import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { BrevoClient } from "@getbrevo/brevo";

const BREVO_BASE = "https://api.brevo.com/v3";

async function syncCustomerGroupToBrevo(
  customerId: string,
  groupId: string,
  groupName: string,
  action: "add" | "remove",
  logger: any
) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    logger.warn("BREVO_API_KEY not configured, skipping customer group sync");
    return;
  }

  const client = new BrevoClient({ apiKey: brevoApiKey });

  // Get customer email from Medusa Customer Module
  let customerEmail: string | undefined;
  try {
    const sdk = (await import("@medusajs/medusa")).default;
    const customer = await sdk.store.customer.retrieve(customerId);
    customerEmail = customer.email;
  } catch (err) {
    logger.error(`Failed to retrieve customer ${customerId}:`, err);
    return;
  }

  if (!customerEmail) {
    logger.warn(`Customer ${customerId} has no email, skipping segment sync`);
    return;
  }

  // Get or create Brevo segment for this customer group
  let segmentId: number | undefined;
  try {
    const segments = await client.contacts.getSegments() as any;
    const existing = segments.segments?.find((s: any) => s.segmentName === groupName);
    segmentId = existing?.id;

    if (!segmentId) {
      const resp = await client.fetch("/v3/contacts/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentName: groupName,
          segmentDescription: `Customer group: ${groupName}`,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        segmentId = data.id;
        logger.info(`Created Brevo segment "${groupName}" (ID: ${segmentId})`);
      } else {
        logger.error(`Failed to create segment "${groupName}": ${resp.status}`);
        return;
      }
    }
  } catch (err) {
    logger.error(`Failed to get/create segment for "${groupName}":`, err);
    return;
  }

  if (!segmentId) {
    logger.error(`No segment ID available for "${groupName}"`);
    return;
  }

  // Add or remove contact from segment
  try {
    const endpoint = action === "add"
      ? `/v3/contacts/segments/${segmentId}/contacts/add`
      : `/v3/contacts/segments/${segmentId}/contacts/remove`;

    const resp = await client.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: [customerEmail] }),
    });

    if (resp.ok) {
      logger.info(
        `${action === "add" ? "Added" : "Removed"} customer ${customerEmail} to/from segment "${groupName}" (ID: ${segmentId})`
      );
    } else {
      logger.error(
        `Failed to ${action} customer to segment ${segmentId}: ${resp.status}`
      );
    }
  } catch (err) {
    logger.error(`Failed to ${action} customer to segment ${segmentId}:`, err);
  }
}

export default async function customerGroupHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger");
  const data = event.data as any;

  if (event.name === "customer_group.customer.added") {
    await syncCustomerGroupToBrevo(
      data.customer_id,
      data.group_id,
      data.group_name || `Group ${data.group_id}`,
      "add",
      logger
    );
  } else if (event.name === "customer_group.customer.removed") {
    await syncCustomerGroupToBrevo(
      data.customer_id,
      data.group_id,
      data.group_name || `Group ${data.group_id}`,
      "remove",
      logger
    );
  }
}

export const config: SubscriberConfig = {
  event: ["customer_group.customer.added", "customer_group.customer.removed"],
};
