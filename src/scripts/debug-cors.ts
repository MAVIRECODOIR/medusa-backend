export default async function debugCors({ container }) {
  console.log("STORE_CORS env:", JSON.stringify(process.env.STORE_CORS))
  console.log("ADMIN_CORS env:", JSON.stringify(process.env.ADMIN_CORS))
  console.log("AUTH_CORS env:", JSON.stringify(process.env.AUTH_CORS))

  try {
    const configModule = container.resolve("configModule")
    const http = configModule.projectConfig?.http
    console.log("storeCors config:", JSON.stringify(http?.storeCors))
    console.log("adminCors config:", JSON.stringify(http?.adminCors))
    console.log("authCors config:", JSON.stringify(http?.authCors))
  } catch (e) {
    console.log("configModule not available:", e.message)
  }

  // Also try the config manager
  try {
    const configManager = container.resolve("configManager")
    const config = configManager.config
    console.log("CM storeCors:", JSON.stringify(config?.projectConfig?.http?.storeCors))
  } catch (e) {
    console.log("configManager not available:", e.message)
  }
}
