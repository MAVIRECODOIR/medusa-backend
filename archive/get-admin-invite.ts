import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Script to retrieve an existing admin user invite token
 * 
 * Usage: medusa exec ./get-admin-invite.ts
 */

export default async function getAdminInvite({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // Configuration - update these values
  const ADMIN_EMAIL = "admin@mavirecodoir.com";

  try {
    logger.info(`Retrieving invite for: ${ADMIN_EMAIL}`);

    const { data: invites } = await query.graph({
      entity: "invite",
      fields: ["id", "email", "token", "expires_at", "accepted"],
      filters: { email: ADMIN_EMAIL },
    });

    if (!invites || invites.length === 0) {
      logger.error(`No invite found for ${ADMIN_EMAIL}`);
      logger.info("Run 'npx medusa exec ./create-admin-invite.ts' to create a new invite");
      return;
    }

    const invite = invites[0];

    if (invite.accepted) {
      logger.warn(`Invite for ${ADMIN_EMAIL} has already been accepted`);
      logger.info("The user should be able to log in directly");
      return;
    }

    logger.info("✅ Invite found!");
    logger.info(`Invite ID: ${invite.id}`);
    logger.info(`Email: ${invite.email}`);
    logger.info(`Token: ${invite.token}`);
    logger.info(`Expires at: ${invite.expires_at}`);
    
    // Construct the invite URL (adjust based on your admin frontend URL)
    const ADMIN_FRONTEND_URL = process.env.ADMIN_FRONTEND_URL || "https://retail-admin.mavirecodoir.com";
    const inviteLink = `${ADMIN_FRONTEND_URL}/invite?token=${invite.token}`;
    
    logger.info(`\n📧 Invite Link: ${inviteLink}`);
    logger.info(`\nSend this link to ${ADMIN_EMAIL} to complete their account setup.`);
    
    return invite;
  } catch (error: any) {
    logger.error(`❌ Failed to retrieve admin invite: ${error.message}`);
    throw error;
  }
}
