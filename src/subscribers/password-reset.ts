import { type SubscriberConfig, type SubscriberArgs } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

const ADMIN_URL = process.env.ADMIN_URL || "https://admin-backend.mavirecodoir.com";
const RETAIL_ADMIN_URL = process.env.RETAIL_ADMIN_URL || "https://retail-admin.mavirecodoir.com";
const STORE_URL = process.env.STORE_URL || "https://www.mavirecodoir.com";

export default async function passwordResetHandler({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger");
  const notificationService = container.resolve(Modules.NOTIFICATION);

  const { entity_id, actor_type, token } = event.data as {
    entity_id: string;
    actor_type: string;
    token: string;
  };

  if (!entity_id || !token) {
    logger.warn("Password reset event missing entity_id or token");
    return;
  }

  const baseUrl = actor_type === "user" ? RETAIL_ADMIN_URL : STORE_URL;
  const resetPath = actor_type === "user" ? "/app/reset-password" : "/reset-password";
  const resetUrl = `${baseUrl}${resetPath}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(entity_id)}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: #000; padding: 32px 40px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 2px;">MAVIRE CODOIR</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #333; font-size: 20px; margin: 0 0 16px;">Reset Your Password</h2>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                We received a request to reset the password for your account. Click the button below to set a new password. This link expires in 15 minutes.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 24px;">
                    <a href="${resetUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 4px; font-size: 14px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0;">
                If you didn't request a password reset, you can safely ignore this email.<br>
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <a href="${resetUrl}" style="color: #666; word-break: break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #f4f4f4; padding: 20px 40px; text-align: center;">
              <p style="color: #999; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} MAVIRE CODOIR. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await notificationService.createNotifications({
      to: entity_id,
      channel: "email",
      template: "password-reset",
      data: {
        html,
        subject: "Reset Your Password — MAVIRE CODOIR",
        actor_type,
      },
    });
    logger.info(`Password reset email sent to ${entity_id}`);
  } catch (err) {
    logger.error(`Failed to send password reset email to ${entity_id}`, err);
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
