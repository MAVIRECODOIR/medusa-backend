import { BrevoClient } from "@getbrevo/brevo";
import * as fs from "fs";
import * as path from "path";

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../../.env");
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function buildPromotionHtml(
  promotion: any,
  heroImage?: string
): string {
  const storeUrl = "https://www.mavirecodoir.com";
  const now = new Date();
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>${promotion.name} - MAVIRE CODOIR</title>
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .dm-body { background-color: #121212 !important; }
  .dm-card { background-color: #1E1E1E !important; }
  .dm-hr { border-top-color: #333333 !important; }
  .dm-heading { color: #F5F5F0 !important; }
  .dm-text { color: #AAAAAA !important; }
  .dm-label { color: #777777 !important; }
  .dm-value { color: #E0E0E0 !important; }
  .dm-btn { background-color: #2E7D5C !important; color: #FFFFFF !important; }
  .dm-footer { color: #666666 !important; }
  .dm-footer a { color: #666666 !important; }
  .dm-footer span { color: #444444 !important; }
  img { opacity: 0.9; }
}
</style>
</head>
<body class="dm-body" style="margin:0; padding:0; background-color:#F5F5F0; font-family:Georgia,'Times New Roman',Times,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F0;">
<tr><td align="center" style="padding:30px 15px;">
<table class="dm-card" width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; max-width:100%; border-collapse:collapse;">
<tr><td align="center" style="padding:45px 40px 25px;">
<a href="${storeUrl}" style="text-decoration:none; border:none; outline:none;">
<img src="https://cdn.mavirecodoir.com/brand/logos/png/1771394628214-zkowej-Mavire%20Codoir%20-%20LOGO.webp" alt="MAVIRE CODOIR" width="180" style="display:block; border:none; outline:none;" border="0">
</a>
</td></tr>
<tr><td style="padding:0 40px;"><hr class="dm-hr" style="border:none; border-top:1px solid #E5E5E0; margin:0;"></td></tr>
${heroImage ? `
<tr><td align="center" style="padding:0;">
<img src="${heroImage}" alt="Promotion" width="600" style="display:block; max-width:100%; border:none; outline:none;" border="0">
</td></tr>
` : ''}
<tr><td style="padding:40px 40px 0;">
<h1 class="dm-heading" style="margin:0; font-size:28px; font-weight:normal; letter-spacing:0.15em; color:#1A1A1A; text-transform:uppercase; text-align:center;">${promotion.name}</h1>
</td></tr>
<tr><td style="padding:30px 40px 0;">
<p class="dm-text" style="margin:0; font-size:16px; color:#666666; text-align:center; line-height:1.6;">${promotion.description || "Special offer for our valued customers"}</p>
</td></tr>
${promotion.code ? `
<tr><td align="center" style="padding:35px 40px 0;">
<table cellpadding="0" cellspacing="0" style="border:2px solid #1A1A1A; border-collapse:collapse;">
<tr><td style="padding:15px 30px; background-color:#1A1A1A;">
<p class="dm-text" style="margin:0; font-size:12px; color:#FFFFFF; text-transform:uppercase; letter-spacing:0.12em; text-align:center;">Use Code</p>
</td></tr>
<tr><td style="padding:20px 30px; background-color:#F5F5F0;">
<p class="dm-value" style="margin:0; font-size:24px; color:#1A1A1A; text-align:center; font-weight:600; letter-spacing:0.1em;">${promotion.code}</p>
</td></tr>
</table>
</td></tr>
` : ''}
${promotion.ends_at ? `
<tr><td style="padding:30px 40px 0;">
<p class="dm-text" style="margin:0; font-size:14px; color:#666666; text-align:center; line-height:1.6;">Valid until: ${new Date(promotion.ends_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>
</td></tr>
` : ''}
<tr><td style="padding:40px 40px 0;"><hr class="dm-hr" style="border:none; border-top:1px solid #E5E5E0; margin:0;"></td></tr>
<tr><td align="center" style="padding:35px 40px 45px;">
<a href="${storeUrl}" class="dm-btn" style="display:inline-block; padding:14px 32px; background-color:#1A1A1A; color:#FFFFFF; text-decoration:none; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; border-radius:2px;">Shop Now</a>
</td></tr>
<tr><td style="padding:0 40px;"><hr class="dm-hr" style="border:none; border-top:1px solid #E5E5E0; margin:0;"></td></tr>
<tr><td class="dm-footer" style="padding:30px 40px 45px;">
<p class="dm-text" style="margin:0; font-size:12px; color:#666666; line-height:1.6;">MAVIRE CODOIR — Contemporary Fashion</p>
<p class="dm-text" style="margin:8px 0 0; font-size:12px; color:#666666; line-height:1.6;">Questions? Contact us at <a href="mailto:hello@mavirecodoir.com" style="color:#666666; text-decoration:none;">hello@mavirecodoir.com</a></p>
<p class="dm-text" style="margin:20px 0 0; font-size:11px; color:#999999; line-height:1.5;">© ${now.getFullYear()} MAVIRE CODOIR. All rights reserved.</p>
<p class="dm-text" style="margin:8px 0 0; font-size:11px; color:#999999; line-height:1.5;"><a href="${storeUrl}/unsubscribe" style="color:#999999; text-decoration:none;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: npx medusa exec src/scripts/build-promotion-campaign.ts <promotion-id> [hero-image-url] [custom-subject]");
    console.error("\nExample:");
    console.error("  npx medusa exec src/scripts/build-promotion-campaign.ts promo_123");
    console.error("  npx medusa exec src/scripts/build-promotion-campaign.ts promo_123 https://cdn.mavirecodoir.com/hero.jpg");
    console.error("  npx medusa exec src/scripts/build-promotion-campaign.ts promo_123 https://cdn.mavirecodoir.com/hero.jpg 'Summer Sale — MAVIRE CODOIR'");
    process.exit(1);
  }

  const promotionId = args[0];
  const heroImage = args[1];
  const customSubject = args[2];

  const env = loadEnv();
  const apiKey = env["BREVO_API_KEY"];
  const fromEmail = env["BREVO_FROM"] || "hello@mavirecodoir.com";

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY in .env");
    process.exit(1);
  }

  const client = new BrevoClient({ apiKey });

  console.log(`\n=== Building Promotion Campaign ===\n`);
  console.log(`Promotion ID: ${promotionId}`);
  if (heroImage) console.log(`Hero Image: ${heroImage}`);
  if (customSubject) console.log(`Custom Subject: ${customSubject}`);
  console.log();

  // Fetch promotion details from Medusa Admin API
  let promotion: any;
  try {
    const medusaUrl = env["MEDUSA_ADMIN_URL"] || "http://localhost:9000";
    const authToken = env["MEDUSA_AUTH_TOKEN"];
    
    if (!authToken) {
      console.error("Missing MEDUSA_AUTH_TOKEN in .env");
      console.error("Set your admin API token to fetch promotion details.");
      process.exit(1);
    }

    const response = await fetch(`${medusaUrl}/admin/promotions/${promotionId}`, {
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    promotion = data.promotion;
    console.log(`✓ Retrieved promotion: ${promotion.name}`);
  } catch (err) {
    console.error(`Failed to retrieve promotion ${promotionId}:`, err);
    console.error("\nMake sure:");
    console.error("  1. The promotion exists in Medusa Admin");
    console.error("  2. MEDUSA_ADMIN_URL is set in .env");
    console.error("  3. MEDUSA_AUTH_TOKEN is set in .env (admin API token)");
    process.exit(1);
  }

  // Build campaign HTML
  const html = buildPromotionHtml(promotion, heroImage);
  const subject = customSubject || `${promotion.name} — MAVIRE CODOIR`;

  console.log(`✓ Built campaign HTML`);

  // Create or update campaign in Brevo
  try {
    const campaignName = `${promotion.name} - ${new Date().toISOString().split('T')[0]}`;
    
    const payload = {
      name: campaignName,
      subject,
      htmlContent: html,
      sender: { email: fromEmail, name: "MAVIRE CODOIR" },
      type: "classic",
    };

    const response = await client.fetch("/v3/emailCampaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      const campaignId = data.id;
      console.log(`✓ Campaign created in Brevo (ID: ${campaignId})`);
      console.log(`\nNext steps:`);
      console.log(`  1. Go to Brevo Dashboard → Campaigns`);
      console.log(`  2. Find campaign: "${campaignName}"`);
      console.log(`  3. Review and edit if needed`);
      console.log(`  4. Select recipients (segment/list)`);
      console.log(`  5. Send or schedule the campaign`);
    } else {
      const errorText = await response.text();
      console.error(`Failed to create campaign: ${response.status}`);
      console.error(`Error: ${errorText}`);
      console.error("\nYou can create the campaign manually in Brevo Dashboard:");
      console.error("  1. Go to Campaigns → Create Campaign");
      console.error("  2. Use the HTML generated above");
      console.error(`  3. Subject: ${subject}`);
    }
  } catch (err: any) {
    console.error(`Failed to create campaign in Brevo:`, err.message);
    console.error("\nYou can create the campaign manually in Brevo Dashboard:");
    console.error("  1. Go to Campaigns → Create Campaign");
    console.error("  2. Use the HTML generated above");
    console.error(`  3. Subject: ${subject}`);
  }
}

main().catch((err) => {
  console.error("Campaign builder failed:", err);
  process.exit(1);
});
