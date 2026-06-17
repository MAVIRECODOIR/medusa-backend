import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { BrevoClient } from "@getbrevo/brevo";
import * as fs from "fs";
import * as path from "path";

const TEMPLATE_FILE = path.resolve(__dirname, "../modules/brevo/templates/campaign-new-collection.html");

function formatPrice(cents: number): string {
  return `\u00A3${(cents / 100).toFixed(2)}`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function trimDesc(desc: string, max: number = 200): string {
  if (!desc) return "";
  return desc.length > max ? desc.substring(0, max).trim() + "\u2026" : desc;
}

function generateProductGrid(products: any[]): string {
  const rows: string[] = [];
  for (let i = 0; i < products.length; i += 2) {
    const left = products[i];
    const right = products[i + 1];

    const cells: string[] = [];
    // Left cell
    if (left) {
      const price = formatPrice(left.calculated_price ?? left.amount ?? 0);
      cells.push(`\
<td style="width:50%; padding:0 8px 0 0; vertical-align:top;">
  <a href="${escapeHtml(left.url)}" style="text-decoration:none;">
    <img src="${escapeHtml(left.imageUrl)}" alt="${escapeHtml(left.title)}" width="100%" style="display:block; border:none;">
    <p style="margin:10px 0 0; font-size:12px; color:#333333; text-align:center; font-family:Georgia,'Times New Roman',Times,serif;">${escapeHtml(left.title)}</p>
    <p style="margin:2px 0 0; font-size:11px; color:#888888; text-align:center; font-family:Arial,Helvetica,sans-serif;">${price}</p>
  </a>
</td>`);
    } else {
      cells.push('<td style="width:50%; padding:0 8px 0 0;"></td>');
    }
    // Right cell
    if (right) {
      const price = formatPrice(right.calculated_price ?? right.amount ?? 0);
      cells.push(`\
<td style="width:50%; padding:0 0 0 8px; vertical-align:top;">
  <a href="${escapeHtml(right.url)}" style="text-decoration:none;">
    <img src="${escapeHtml(right.imageUrl)}" alt="${escapeHtml(right.title)}" width="100%" style="display:block; border:none;">
    <p style="margin:10px 0 0; font-size:12px; color:#333333; text-align:center; font-family:Georgia,'Times New Roman',Times,serif;">${escapeHtml(right.title)}</p>
    <p style="margin:2px 0 0; font-size:11px; color:#888888; text-align:center; font-family:Arial,Helvetica,sans-serif;">${price}</p>
  </a>
</td>`);
    } else {
      cells.push('<td style="width:50%; padding:0 0 0 8px;"></td>');
    }
    rows.push(`<tr>${cells[0]}${cells[1]}</tr>`);
  }
  return rows.join("\n");
}

function getArg(index: number): string | null {
  // Find the script path in argv, everything after is user args
  const scriptIdx = process.argv.findIndex(a => a.includes("build-campaign.ts"));
  if (scriptIdx === -1) return null;
  return process.argv[scriptIdx + 1 + index] || null;
}

export default async function buildCampaign({ container }: { container: any }) {
  const handle = getArg(0);
  const subjectOverride = getArg(1);
  const heroOverride = getArg(2);
  if (!handle) {
    console.error("Usage: npx medusa exec src/scripts/build-campaign.ts <collection-handle> [subject] [hero-image-url]");
    process.exit(1);
  }

  const apiKey = process.env.BREVO_API_KEY;
  const storeUrl = process.env.STORE_URL || "https://www.mavirecodoir.com";
  const fromEmail = process.env.BREVO_FROM || "noreply@mavirecodoir.com";
  const senderName = process.env.BREVO_SENDER_NAME || "MAVIRE CODOIR";

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY in .env");
    process.exit(1);
  }

  const client = new BrevoClient({ apiKey });
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // ── Fetch collection ──
  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title", "handle", "metadata"],
    filters: { handle },
  });

  if (!collections || collections.length === 0) {
    console.error(`Collection with handle "${handle}" not found`);
    process.exit(1);
  }

  const collection = collections[0];
  const collectionUrl = `${storeUrl}/collections/${collection.handle}`;

  logger.info(`Building campaign for collection: "${collection.title}"`);

  // ── Fetch products in collection ──
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "handle", "thumbnail",
      "variants.id", "variants.sku", "variants.amount",
      "images.id", "images.url",
    ],
    filters: { collection_id: [collection.id] },
  });

  logger.info(`Found ${products.length} products in collection`);

  // ── Build product data ──
  const enriched = products.map((p: any) => {
    const thumbnail = p.thumbnail || p.images?.[0]?.url || "";
    const firstVar = p.variants?.[0];
    return {
      title: p.title,
      url: `${storeUrl}/products/${p.handle}`,
      imageUrl: thumbnail,
      amount: firstVar?.amount || 0,
      calculated_price: firstVar?.calculated_price || firstVar?.amount || 0,
    };
  });

  // ── Read template ――
  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error(`Template file not found: ${TEMPLATE_FILE}`);
    process.exit(1);
  }

  let html = fs.readFileSync(TEMPLATE_FILE, "utf-8");

  // ── Replace markers ──
  html = html.replace("<!-- COLLECTION_NAME -->", escapeHtml(collection.title));
  html = html.replace("<!-- COLLECTION_DESCRIPTION -->", escapeHtml(trimDesc(collection.metadata?.description || "")));
  html = html.replace(/<!-- COLLECTION_URL -->/g, collectionUrl);
  html = html.replace(/<!-- STORE_URL -->/g, storeUrl);
  html = html.replace("<!-- INSTAGRAM_URL -->", "https://www.instagram.com/mavirecodoir/");
  html = html.replace("<!-- UNSUBSCRIBE_URL -->", `${storeUrl}/unsubscribe`);
  html = html.replace("<!-- YEAR -->", new Date().getFullYear().toString());

  // ── Generate product grid ──
  const productGrid = generateProductGrid(enriched);
  html = html.replace("<!-- PRODUCT_GRID -->", productGrid);

  // ── Handle hero image ──
  if (heroOverride) {
    html = html.replace("<!-- HERO_IMAGE -->",
      `<tr><td style="padding:0;">
        <a href="${collectionUrl}">
          <img src="${escapeHtml(heroOverride)}" alt="${escapeHtml(collection.title)}" width="100%" style="display:block; border:none;">
        </a>
      </td></tr>`
    );
  } else {
    html = html.replace("<!-- HERO_IMAGE -->", "");
  }

  // ── Campaign name & subject ──
  const campaignName = `${collection.title} Campaign - MAVIRE CODOIR`;
  const campaignSubject = subjectOverride || `Discover ${collection.title} — MAVIRE CODOIR`;

  // ── Create or update draft campaign ──
  const existingResp = (await client.emailCampaigns.getEmailCampaigns({ status: "draft" })) as any;
  const existing = existingResp.campaigns?.find((c: any) => c.name === campaignName);

  if (existing) {
    logger.info(`Updating existing draft: "${campaignName}" (ID: ${existing.id})`);
    await client.emailCampaigns.updateEmailCampaign(existing.id, {
      name: campaignName,
      subject: campaignSubject,
      htmlContent: html,
      sender: { email: fromEmail, name: senderName },
    } as any);
    logger.info(`✓ Updated draft (ID: ${existing.id})`);
  } else {
    const resp = (await client.emailCampaigns.createEmailCampaign({
      name: campaignName,
      subject: campaignSubject,
      htmlContent: html,
      sender: { email: fromEmail, name: senderName },
    } as any)) as any;
    logger.info(`✓ Created draft (ID: ${resp.id})`);
  }

  console.log(`\n  Campaign:  ${campaignName}`);
  console.log(`  Subject:   "${campaignSubject}"`);
  console.log(`  Products:  ${enriched.length}`);
  console.log(`  Dashboard: Brevo → Campaigns → Find "${campaignName}"\n`);
}
