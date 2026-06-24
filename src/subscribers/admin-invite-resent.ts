import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Resend } from "resend"

export default async function adminInviteResentHandler({ 
  event: { data },
  container 
}: SubscriberArgs<{ id: string; email: string; token: string }>) {
  console.log("admin-invite-resent subscriber triggered with data:", JSON.stringify(data))
  
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.BREVO_FROM || "noreply@mavirecodoir.com"
  
  const { email, token } = data
  
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
  
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject: "You're Invited to Join MAVIRE CODOIR",
      html,
    })
    
    if (error) {
      console.error("Failed to send admin invite email (resent):", error)
    } else {
      console.log(`Admin invite email sent to ${email} (resent):`, data?.id)
    }
  } catch (error) {
    console.error("Error sending admin invite email (resent):", error)
  }
}

export const config: SubscriberConfig = {
  event: "invite.resent",
  context: {
    subscriberId: "admin-invite-resent",
  }
}
