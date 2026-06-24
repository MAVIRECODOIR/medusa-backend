import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function adminInviteResentHandler({ 
  event,
  container 
}: SubscriberArgs) {
  console.log("admin-invite-resent subscriber triggered with full event:", JSON.stringify(event))
  console.log("admin-invite-resent subscriber triggered with event.data:", JSON.stringify(event.data))
  
  const logger = container.resolve("logger")
  const notificationService = container.resolve(Modules.NOTIFICATION)
  
  // The event only contains the invite ID, we need to fetch the full invite
  const data = event.data as any
  const inviteId = data.id
  
  console.log("Fetching invite with ID:", inviteId)
  
  if (!inviteId) {
    logger.error("Missing invite ID in event data", data)
    return
  }
  
  try {
    // Try to get invite service using different possible names
    let inviteService: any
    try {
      inviteService = container.resolve("invite")
    } catch {
      try {
        inviteService = container.resolve("inviteModuleService")
      } catch {
        try {
          inviteService = container.resolve("inviteService")
        } catch {
          logger.error("Could not resolve invite service from container")
          return
        }
      }
    }
    
    console.log("Invite service resolved, attempting retrieve")
    console.log("Service methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(inviteService)))
    
    let invite: any
    try {
      invite = await inviteService.retrieve(inviteId, {
        select: ["id", "email", "token"],
      })
    } catch (e) {
      console.log("Retrieve with select failed, trying without options")
      invite = await inviteService.retrieve(inviteId)
    }
    
    console.log("Retrieved invite:", JSON.stringify(invite))
    console.log("Invite keys:", invite ? Object.keys(invite) : "null")
    
    if (!invite) {
      logger.error("Invite not found", inviteId)
      return
    }
    
    const email = invite.email || invite.to
    const token = invite.token || invite.accept_token
    
    console.log("Extracted email:", email, "token:", token)
    
    if (!email || !token) {
      logger.error(`Missing email or token in invite object: ${JSON.stringify(invite)}`)
      return
    }
  
    // Build the invite URL - this should point to the retail admin panel
    const inviteUrl = `${process.env.STORE_URL || "https://retail-admin.mavirecodoir.com"}/accept-invite?token=${token}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited to Join MAVIRE CODOIR</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background: #000; padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 2px;">MAVIRE CODOIR</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin-top: 0; color: #000;">You're Invited to Join Our Team</h2>
            <p style="margin-bottom: 20px;">Hello,</p>
            <p style="margin-bottom: 20px;">You have been invited to join the MAVIRE CODOIR admin team. Click the button below to accept your invitation and set up your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="margin-bottom: 20px; font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="margin-bottom: 20px; font-size: 14px; color: #666; word-break: break-all;">${inviteUrl}</p>
            <p style="margin-bottom: 20px; font-size: 14px; color: #666;">This invitation will expire in 7 days.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="margin: 0; font-size: 12px; color: #999;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">© ${new Date().getFullYear()} MAVIRE CODOIR. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: "admin-invite",
      data: {
        html,
        subject: "You're Invited to Join MAVIRE CODOIR",
      },
    })
    logger.info(`Admin invite email sent to ${email} (resent)`)
  } catch (error) {
    logger.error(`Failed to send admin invite email`, error)
  }
}

export const config: SubscriberConfig = {
  event: "invite.resent",
  context: {
    subscriberId: "admin-invite-resent",
  }
}
