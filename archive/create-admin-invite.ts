import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createInvitesWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Script to create an admin user invite in Medusa v2
 * 
 * Usage: medusa exec ./create-admin-invite.ts
 * 
 * This script creates an invite for an admin user. The user will need to:
 * 1. Accept the invite via the returned token/link
 * 2. Set their password during the acceptance process
 */

export default async function createAdminInvite({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Configuration - update these values
  const ADMIN_EMAIL = "admin@mavirecodoir.com";
  // Note: RBAC roles are optional. If RBAC module is not configured, omit roles.
  const ADMIN_ROLES = null; // or ["role_super_admin"] if RBAC is configured

  try {
    logger.info(`Creating admin invite for: ${ADMIN_EMAIL}`);

    const { result } = await createInvitesWorkflow(container).run({
      input: {
        invites: [{
          email: ADMIN_EMAIL,
          roles: ADMIN_ROLES,
        }],
      },
    });

    const invite = result[0];

    logger.info("✅ Admin invite created successfully!");
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
    logger.error(`❌ Failed to create admin invite: ${error.message}`);
    throw error;
  }
}
