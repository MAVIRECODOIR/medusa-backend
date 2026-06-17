import { BrevoClient } from "@getbrevo/brevo";
import * as fs from "fs";
import * as path from "path";

const TEMPLATES_DIR = path.resolve(__dirname, "../modules/brevo/templates");
const OUTPUT_FILE = path.resolve(__dirname, "../modules/brevo/template-ids.json");

type TemplateConfig = {
  fileName: string;
  templateName: string;
  subject: string;
  tag: string;
};

const TEMPLATES: TemplateConfig[] = [
  {
    fileName: "order-confirmation.html",
    templateName: "Order Confirmation - MAVIRE CODOIR",
    subject: "Your Order Has Been Confirmed — MAVIRE CODOIR",
    tag: "transactional",
  },
  {
    fileName: "shipping-confirmation.html",
    templateName: "Shipping Confirmation - MAVIRE CODOIR",
    subject: "Your Order Has Been Shipped — MAVIRE CODOIR",
    tag: "transactional",
  },
  {
    fileName: "welcome.html",
    templateName: "Welcome Series - MAVIRE CODOIR",
    subject: "Welcome to MAVIRE CODOIR",
    tag: "automation",
  },
  {
    fileName: "abandoned-cart.html",
    templateName: "Abandoned Cart - MAVIRE CODOIR",
    subject: "You Left Something Behind — MAVIRE CODOIR",
    tag: "automation",
  },
  {
    fileName: "cancellation-refund.html",
    templateName: "Cancellation Refund - MAVIRE CODOIR",
    subject: "Your Order Has Been Cancelled — MAVIRE CODOIR",
    tag: "transactional",
  },
  {
    fileName: "campaign-new-collection.html",
    templateName: "New Collection Campaign - MAVIRE CODOIR",
    subject: "Discover the New Collection — MAVIRE CODOIR",
    tag: "campaign",
  },
  {
    fileName: "post-purchase-followup.html",
    templateName: "Post-Purchase Follow-Up - MAVIRE CODOIR",
    subject: "How Was Your Experience? — MAVIRE CODOIR",
    tag: "automation",
  },
];

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../../.env");
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      env[key] = value;
    }
  }
  return env;
}

async function uploadTemplates() {
  const env = loadEnv();
  const apiKey = env["BREVO_API_KEY"];
  const fromEmail = env["BREVO_FROM"] || "noreply@mavirecodoir.com";
  const senderName = env["BREVO_SENDER_NAME"] || "MAVIRE CODOIR";

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY in .env");
    process.exit(1);
  }

  const client = new BrevoClient({ apiKey });

  console.log("Fetching existing templates...");
  let existingTemplates: { name: string; id: number }[] = [];
  try {
    const existing = (await client.transactionalEmails.getSmtpTemplates({ templateStatus: true })) as any;
    if (existing.templates) {
      existingTemplates = existing.templates.map((t: any) => ({
        name: t.name || t.templateName || "",
        id: t.id,
      }));
    }
  } catch (err: any) {
    console.log("Could not fetch existing templates (first run OK):", err.message);
  }

  const templateMap: Record<string, { id: number; name: string; subject: string }> = {};

  for (const cfg of TEMPLATES) {
    const filePath = path.join(TEMPLATES_DIR, cfg.fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ Skipping ${cfg.templateName}: file not found at ${filePath}`);
      continue;
    }

    let htmlContent = fs.readFileSync(filePath, "utf-8");

    const existing = existingTemplates.find((t) => t.name === cfg.templateName);
    if (existing) {
      console.log(`⟳ Updating "${cfg.templateName}" (ID: ${existing.id})...`);
      try {
        await client.transactionalEmails.updateSmtpTemplate({
          templateId: existing.id,
          htmlContent,
          subject: cfg.subject,
          sender: { email: fromEmail, name: senderName },
          templateName: cfg.templateName,
          tag: cfg.tag,
          isActive: true,
        });
        templateMap[cfg.fileName.replace(".html", "")] = {
          id: existing.id,
          name: cfg.templateName,
          subject: cfg.subject,
        };
        console.log(`  ✓ Updated (ID: ${existing.id})`);
      } catch (err: any) {
        console.error(`  ✗ Failed to update: ${err.message}`);
      }
    } else {
      console.log(`+ Creating "${cfg.templateName}"...`);
      try {
        const resp = (await client.transactionalEmails.createSmtpTemplate({
          htmlContent,
          subject: cfg.subject,
          sender: { email: fromEmail, name: senderName },
          templateName: cfg.templateName,
          tag: cfg.tag,
          isActive: true,
        })) as any;
        const templateId = resp.id;
        if (templateId) {
          templateMap[cfg.fileName.replace(".html", "")] = {
            id: templateId,
            name: cfg.templateName,
            subject: cfg.subject,
          };
          console.log(`  ✓ Created (ID: ${templateId})`);
        } else {
          console.error(`  ✗ No ID returned`);
        }
      } catch (err: any) {
        console.error(`  ✗ Failed to create: ${err.message}`);
      }
    }
  }

  if (Object.keys(templateMap).length > 0) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(templateMap, null, 2), "utf-8");
    console.log(`\n✓ Template IDs saved to ${OUTPUT_FILE}`);
    console.log("\nTemplate ID Mapping:");
    for (const [key, val] of Object.entries(templateMap)) {
      console.log(`  ${key}: ${val.id}`);
    }
  } else {
    console.log("\nNo templates were uploaded.");
  }
}

uploadTemplates().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
