import { BrevoClient } from "@getbrevo/brevo";
import * as fs from "fs";
import * as path from "path";

const SEGMENT_IDS_PATH = path.resolve(__dirname, "../modules/brevo/segment-ids.json");

type SegmentMap = Record<string, number>;

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

  const groups = [
    { name: "VIP Customers", description: "High-value customers (spent £500+)" },
    { name: "Wholesale", description: "B2B wholesale accounts" },
    { name: "First-time Buyers", description: "Customers with 1 order" },
    { name: "Repeat Customers", description: "Customers with 2+ orders" },
  ];

  const segmentIds: SegmentMap = {};

  // Load existing segment IDs
  let existingSegments: SegmentMap = {};
  try {
    if (fs.existsSync(SEGMENT_IDS_PATH)) {
      existingSegments = JSON.parse(fs.readFileSync(SEGMENT_IDS_PATH, "utf-8"));
    }
  } catch (err) {
    console.warn("Could not load existing segment-ids.json");
  }

  // Try to get existing segments from Brevo
  let brevoSegments: any[] = [];
  try {
    const existingResp = (await client.contacts.getSegments()) as any;
    brevoSegments = existingResp.segments || [];
  } catch (err) {
    console.warn("Could not fetch existing segments from Brevo");
  }

  console.log("\n=== Creating Customer Group Segments in Brevo ===\n");

  for (const group of groups) {
    // Check if already exists in Brevo
    const existingInBrevo = brevoSegments.find((s: any) => s.segmentName === group.name);
    if (existingInBrevo) {
      segmentIds[group.name] = existingInBrevo.id;
      console.log(`  ∼ Segment "${group.name}" already exists in Brevo (ID: ${existingInBrevo.id})`);
      continue;
    }

    // Check if we have it locally
    if (existingSegments[group.name]) {
      segmentIds[group.name] = existingSegments[group.name];
      console.log(`  ∼ Segment "${group.name}" found locally (ID: ${existingSegments[group.name]})`);
      continue;
    }

    // Create new segment
    try {
      const resp = await client.fetch("/v3/contacts/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentName: group.name,
          segmentDescription: group.description,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        segmentIds[group.name] = data.id;
        console.log(`  ✓ Created segment "${group.name}" (ID: ${data.id})`);
      } else {
        const text = await resp.text();
        console.log(`  ∼ Failed to create "${group.name}" (${resp.status}): ${text}`);
        console.log(`    → Create manually in Brevo dashboard → Contacts → Segments`);
      }
    } catch (err: any) {
      console.log(`  ∼ Failed to create "${group.name}": ${err.message}`);
      console.log(`    → Create manually in Brevo dashboard → Contacts → Segments`);
    }
  }

  // Merge with existing segments and save
  const allSegments = { ...existingSegments, ...segmentIds };
  if (Object.keys(allSegments).length > 0) {
    fs.writeFileSync(SEGMENT_IDS_PATH, JSON.stringify(allSegments, null, 2));
    console.log(`\n  → Segment IDs saved to segment-ids.json`);
  }

  console.log("\n=== Next Steps ===\n");
  console.log("1. Create customer groups in Medusa Admin:");
  console.log("   - Go to Settings → Customer Groups");
  console.log("   - Create groups: VIP Customers, Wholesale, First-time Buyers, Repeat Customers");
  console.log("\n2. Assign customers to groups in Medusa Admin:");
  console.log("   - Go to Customers → Select customer → Edit → Assign to group");
  console.log("\n3. The sync-customer-groups subscriber will automatically:");
  console.log("   - Sync group assignments to Brevo segments");
  console.log("   - Add/remove customers from Brevo segments when groups change");
  console.log("\n4. Create Brevo automations for each segment:");
  console.log("   - VIP Customers: Send exclusive offers, early access");
  console.log("   - Wholesale: Send bulk pricing, B2B updates");
  console.log("   - First-time Buyers: Welcome series, product recommendations");
  console.log("   - Repeat Customers: Loyalty rewards, referral programs");
}

export default async function () {
  await main();
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
