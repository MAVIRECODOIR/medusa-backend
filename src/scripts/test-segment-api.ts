import * as fs from "fs";

async function main() {
  const apiKey = fs.readFileSync(".env", "utf-8").split("\n").find((l) => l.startsWith("BREVO_API_KEY"))!.split("=")[1].trim();

  // Test 1: Try creating segment with v3 API directly
  console.log("=== Test 1: POST /v3/contacts/segment (raw fetch) ===");
  try {
    const resp = await fetch("https://api.brevo.com/v3/contacts/segment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({ segmentName: "API Test", segmentDescription: "test segment" }),
    });
    const body = await resp.text();
    console.log("Status:", resp.status, "Body:", body);
  } catch (e: any) {
    console.log("Error:", e.message);
  }

  // Test 2: Try with v1 of the API
  console.log("\n=== Test 2: GET /v3/contacts/segments (list existing) ===");
  try {
    const resp = await fetch("https://api.brevo.com/v3/contacts/segments", {
      headers: { "api-key": apiKey },
    });
    const body = await resp.json();
    console.log("Status:", resp.status, "Segments:", JSON.stringify(body, null, 2));
  } catch (e: any) {
    console.log("Error:", e.message);
  }

  // Test 3: Check what unsubscription pages are available
  console.log("\n=== Test 3: Check existing unsubscription pages ===");
  try {
    const resp = await fetch("https://api.brevo.com/v3/contacts/pages", {
      headers: { "api-key": apiKey },
    });
    const body = await resp.text();
    console.log("Status:", resp.status, "Body:", body.slice(0, 500));
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

main();
