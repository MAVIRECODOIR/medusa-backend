import { BrevoClient } from "@getbrevo/brevo";
import * as fs from "fs";
import * as path from "path";

const TEMPLATE_IDS_PATH = path.resolve(__dirname, "../modules/brevo/template-ids.json");

type TemplateMap = Record<string, { id: number; name: string; subject: string }>;

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

async function main() {
  const env = loadEnv();
  const apiKey = env["BREVO_API_KEY"];

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY in .env");
    process.exit(1);
  }

  const client = new BrevoClient({ apiKey });
  const templates: TemplateMap = JSON.parse(fs.readFileSync(TEMPLATE_IDS_PATH, "utf-8"));

  // ── 1. Create Contact Segments ──
  console.log("\n=== Creating Contact Segments ===\n");

  const segments = [
    { segmentName: "Newsletter Subscribers", segmentDescription: "Active newsletter subscribers" },
    { segmentName: "Abandoned Cart Prospects", segmentDescription: "Contacts with abandoned carts < 7 days" },
    { segmentName: "VIP Customers (Spent £500+)", segmentDescription: "High-value repeat customers" },
    { segmentName: "VIP Customers", segmentDescription: "High-value customers (spent £500+)" },
    { segmentName: "Wholesale", segmentDescription: "B2B wholesale accounts" },
    { segmentName: "First-time Buyers", segmentDescription: "Customers with 1 order" },
    { segmentName: "Repeat Customers", segmentDescription: "Customers with 2+ orders" },
  ];

  const createdSegments: Record<string, number> = {};
  // Try to get existing segments first
  let existingSgs: any[] = [];
  try {
    const existingResp = (await client.contacts.getSegments()) as any;
    existingSgs = existingResp.segments || [];
  } catch {}

  for (const seg of segments) {
    const found = existingSgs.find((s: any) => s.segmentName === seg.segmentName);
    if (found) {
      console.log(`  ∼ Segment "${seg.segmentName}" already exists (ID: ${found.id})`);
      createdSegments[seg.segmentName] = found.id;
      continue;
    }
    try {
      const resp = await client.fetch("/v3/contacts/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentName: seg.segmentName, segmentDescription: seg.segmentDescription }),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        if (data.id) {
          createdSegments[seg.segmentName] = data.id;
          console.log(`  ✓ Segment "${seg.segmentName}" created (ID: ${data.id})`);
        }
      } else {
        const text = await resp.text();
        console.log(`  ∼ Segment "${seg.segmentName}" (${resp.status}): Create manually in Brevo dashboard`);
      }
    } catch (err: any) {
      console.log(`  ∼ Segment "${seg.segmentName}": Create manually in Brevo dashboard → Contacts → Segments`);
    }
  }

  if (Object.keys(createdSegments).length > 0) {
    fs.writeFileSync(
      path.resolve(__dirname, "../modules/brevo/segment-ids.json"),
      JSON.stringify(createdSegments, null, 2)
    );
    console.log(`  → Segment IDs saved to segment-ids.json`);
  }

  // ── NOTE: Campaigns now built via build-campaign.ts ──
  console.log("\n=== Campaign Drafts ===\n");
  console.log("  Campaigns are no longer created as placeholders here.");
  console.log("  Use the campaign builder script instead:\n");
  console.log("    npx medusa exec src/scripts/build-campaign.ts --handle <collection-handle>\n");
  console.log("  This will fetch products from the collection, render them inline,");
  console.log("  and create/update a campaign draft in Brevo.\n");
  console.log("  Examples:\n");
  console.log("    npx medusa exec src/scripts/build-campaign.ts --handle new-arrivals");
  console.log("    npx medusa exec src/scripts/build-campaign.ts --handle men --hero https://.../hero.jpg");
  console.log("    npx medusa exec src/scripts/build-campaign.ts --handle women --subject \"Summer Edit — MAVIRE CODOIR\"\n");

  // ── 3. Register Custom Event Types for Automation Triggers ──
  console.log("\n=== Registering Custom Events for Automation Triggers ===\n");
  console.log("  Sending one event per type to register them in Brevo...\n");

  const testEmail = "setup@mavirecodoir.com";
  const eventsToRegister = [
    { event_name: "order_placed",     properties: { order_id: "setup-1", total: 0, currency: "GBP", item_count: 0 } },
    { event_name: "order_shipped",    properties: { order_id: "setup-1", fulfillment_id: "setup-1" } },
    { event_name: "order_cancelled",  properties: { order_id: "setup-1" } },
    { event_name: "cart_abandoned",   properties: { cart_total: 0, item_count: 0 } },
    { event_name: "back_in_stock_interest", properties: { product_id: "setup-1", variant_id: "setup-1", variant_title: "S / Ecru", product_title: "Test Product" } },
    { event_name: "draft_order_created", properties: { draft_id: "setup-1", total: 0, currency: "GBP" } },
    { event_name: "draft_order_updated", properties: { draft_id: "setup-1", total: 0 } },
    { event_name: "promotion_used", properties: { promotion_id: "setup-1", promotion_code: "TEST10", discount_amount: 10 } },
    { event_name: "campaign_started", properties: { campaign_id: "setup-1", campaign_name: "Summer Sale" } },
  ];

  for (const evt of eventsToRegister) {
    try {
      await client.event.createEvent({
        event_name: evt.event_name,
        identifiers: { email_id: testEmail },
        event_properties: evt.properties,
      } as any);
      console.log(`  ✓ "${evt.event_name}" registered — should now appear in automation trigger dropdown`);
    } catch (err: any) {
      if (err.status === 400) {
        console.log(`  ∼ "${evt.event_name}" may already be registered (${err.message})`);
      } else {
        console.log(`  ∼ "${evt.event_name}" could not be registered: ${err.message}`);
        console.log(`    → Create it manually in Automation > Workflows > Event trigger`);
      }
    }
  }

  // ── 4. Create TOTAL_SPENT Contact Attribute ──
  console.log("\n=== Creating TOTAL_SPENT Contact Attribute ===\n");
  try {
    await client.fetch("/v3/contacts/attributes/normal/TOTAL_SPENT", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "float" }),
    });
    console.log("  ✓ TOTAL_SPENT attribute created (numeric)");
    console.log("  → Now create a VIP segment: filter → TOTAL_SPENT > 500");
  } catch (err: any) {
    if (err.status === 400) {
      console.log("  ∼ TOTAL_SPENT attribute already exists");
    } else {
      console.log(`  ∼ Could not create attribute: ${err.message}`);
      console.log("  → Create manually: Contacts → Attributes → Add 'TOTAL_SPENT' (type: number)");
    }
  }

  // ── 5. Output Dashboard Setup Instructions ──
  console.log("\n" + "=".repeat(60));
  console.log("  BREVO AUTOMATION & CAMPAIGN SETUP GUIDE");
  console.log("=".repeat(60));

  console.log(`
┌─ AUTOMATIONS (Brevo Dashboard → Automation → Workflows) ──────────────────┐
│                                                                             │
│  Brevo offers two ways to create workflows:                                 │
│    A) "Start with a sentence, we'll build your automation" (AI guided)      │
│    B) "Write your own" (manual workflow builder)                            │
│                                                                             │
│  ╔══ OPTION A: AI GUIDED MODE ═════════════════════════════════════════════╗│
│  ║  Click "Start with a sentence" and paste the prompts below:            ║│
│  ╠══════════════════════════════════════════════════════════════════════════╣│
│  ║  1. WELCOME SERIES                                                     ║│
│  ║     "When a contact is added to the newsletter list (ID: 2), send       ║│
│  ║      them the Welcome - MAVIRE CODOIR template (ID: 3) immediately."    ║│
│  ║                                                                         ║│
│  ║  2. ABANDONED CART                                                      ║│
│  ║     "When a cart_abandoned event is received, wait 4 hours, then send   ║│
│  ║      the Abandoned Cart template (ID: 4) to the contact."              ║│
│  ║                                                                         ║│
│  ║  3. POST-PURCHASE FOLLOW-UP                                             ║│
│  ║     "When an order_placed event is received, wait 7 days, then send     ║│
│  ║      the Post-Purchase Follow-Up template (ID: 14) to the contact."     ║│
│  ╚══════════════════════════════════════════════════════════════════════════╝│
│                                                                             │
│  ╔══ OPTION B: MANUAL MODE ════════════════════════════════════════════════╗│
│  ║  Click "Write your own" then configure each workflow:                  ║│
│  ╠══════════════════════════════════════════════════════════════════════════╣│
│  ║  1. WELCOME SERIES                                                     ║│
│  ║     Trigger: "Contact added to a list" → Select newsletter list (ID: 2)║│
│  ║     Action: Send email → Template: "Welcome - MAVIRE CODOIR" (ID: 3)   ║│
│  ║     (Add optional delay + second email after 24h with brand intro)      ║│
│  ║                                                                         ║│
│  ║  2. ABANDONED CART                                                      ║│
│  ║     Trigger: "Event" → Custom event name: "cart_abandoned"              ║│
│  ║     Delay: 4 hours                                                      ║│
│  ║     Action: Send email → Template: "Abandoned Cart" (ID: 4)             ║│
│  ║     (Optional: add second branch after 24h with 10% discount code)      ║│
│  ║                                                                         ║│
│  ║  3. POST-PURCHASE FOLLOW-UP                                             ║│
│  ║     Trigger: "Event" → Custom event name: "order_placed"                ║│
│  ║     Delay: 7 days                                                       ║│
│  ║     Action: Send email → Template: "Post-Purchase Follow-Up" (ID: 14)   ║│
│  ╚══════════════════════════════════════════════════════════════════════════╝│
│                                                                             │
│  ⚠ NOTE: Pre-built ecommerce automation templates (Shopify/WooCommerce)    ││
│    cannot be used with Medusa. All workflows must be built from scratch.    ││
│    The guided AI mode ("Start with a sentence") makes this much faster.    ││
│                                                                             ││
│  After running this script, the 4 custom event types (order_placed,         ││
│  order_shipped, order_cancelled, cart_abandoned) are now registered.        ││
│  They will appear in the "Event" trigger dropdown in the workflow builder.  ││
│  If not, refresh the page or wait 2-3 minutes for Brevo to process them.   ││
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ CAMPAIGNS (Build via script, launch from dashboard) ─────────────────────┐
│                                                                             │
│  Build a campaign from any collection:                                      │
│                                                                             │
│    npx medusa exec src/scripts/build-campaign.ts --handle <handle>          │
│                                                                             │
│  Options:                                                                   │
│    --handle   Collection handle (required, e.g. "new-arrivals", "men")      │
│    --hero     Full-width hero image URL (optional)                          │
│    --subject  Custom subject line (optional)                                │
│                                                                             │
│  The script:                                                                │
│    1. Fetches collection + products from Medusa                             │
│    2. Renders complete HTML with product images, names, prices, links       │
│    3. Creates or updates a campaign draft in Brevo                           │
│                                                                             │
│  Then launch from dashboard:                                                │
│    Brevo → Campaigns → Find campaign → Review → Send or schedule            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ CATALOG SYNC (Automated via subscribers) ────────────────────────────────┐
│                                                                             │
│  Subscriber: src/subscribers/sync-product-catalog.ts                        │
│    → product.created / .updated    → Upserts product in Brevo catalog      │
│    → product.deleted               → Marks product as deleted in Brevo     │
│    → product_collection.created    → Creates category in Brevo             │
│    → product_collection.updated    → Updates category in Brevo             │
│    → product_collection.deleted    → Removes category in Brevo             │
│                                                                             │
│  Initial bulk sync:                                                         │
│    npx medusa exec src/scripts/initial-catalog-sync.ts                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
┌─ EVENT TRACKING + ORDER SYNC (Already configured) ────────────────────────┐
│                                                                             │
│  Subscriber: src/subscribers/brevo-events.ts                                │
│    → order.placed      → event: "order_placed" + updates TOTAL_SPENT       │
│                           + creates order in Brevo ecommerce               │
│    → fulfillment.created → event: "order_shipped"                          │
│    → order.cancelled   → event: "order_cancelled"                          │
│                                                                             │
│  Subscriber: src/subscribers/abandoned-cart.ts                              │
│    → cart.customer_updated → event: "cart_abandoned"                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
┌─ SEGMENTS ──────────────────────────────────────────────────────────────────┐
│                                                                             │
│  1. Newsletter audience   → Use built-in "All email subscribers" template  │
│  2. Abandoned Cart        → Filter: Event "cart_abandoned" in last 7 days  │
│  3. VIP Customers (£500+) → Filter: TOTAL_SPENT > 500                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ TEMPLATE ID REFERENCE ────────────────────────────────────────────────────┐
│                                                                             │
${Object.entries(templates)
  .map(([key, val]) => `  │  ${val.id.toString().padEnd(3)}  ${val.name.padEnd(42)} ${key}`)
  .join("\n")}
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
`);
}

export default async function () {
  await main();
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
