# Medusa Backend + Admin Portal Progress

## Goal
Build and maintain a luxury fashion e-commerce platform (Medusa v2 backend + standalone admin retail portal) with full checkout/returns workflow, notifications, audit trail, and customer operations tooling.

## Done
- **PayPal plugin**: swapped `@alphabite/medusa-paypal` → `@easypayment/medusa-payment-paypal` (official PayPal Partner)
- **Stripe 3DS redirect** handled in checkout, auto-completes cart on return
- **Order confirmation page** (`/order/[id]`): secure, token/session-auth, StatusTimeline
- **Guest email checker**: debounced check via `/api/account/check-email`, blocks guest if email registered
- **Brevo notification module**: template-based (1=Confirm, 2=Shipping, 5=Cancel/Refund), generates secure order URL with token
- **Order access security**: 64-char hex token in `order.metadata.access_token`, validated on read
- **Custom backend routes**: order token generation/retrieval, track-order, return-info, return submission
- **Admin return management**: AUTHENTICATE=false + x-admin-secret auth, approve/reject with audit trail
- **Guest-to-account linking**: `order.placed` subscriber stores `linked_customer_id`; `/custom/account/orders` returns owned + linked orders
- **Cart item shipping profile mismatch FIXED**: Changed `ensure-defaults.ts` from Standard profile to Default profile for all shipping options; Standard profile and orphan options deleted from DB
- **PayPal `[object Object]` error FIXED**: Project-level route override at `src/api/store/payment-collections/[id]/payment-sessions/route.ts` handles serialized workflow errors properly; bypasses PayPal plugin's broken error handling
- **Core-flows patch**: `patches/@medusajs+core-flows+2.16.0.patch` whitelists safe fields in `deletePaymentSessionsStep` compensation
- **Admin retail portal** (`admin-retail-mavirecodoir/`): Next.js 15 + Tailwind v4, 18 API proxy routes, 13 live-data pages
- **Audit log module**: model + migrations, admin API with filters/count, entries on return/support/pre-order/back-in-stock actions
- **Toast notification system**: custom context-based with 4 types, auto-dismiss, integrated across all admin pages
- **UK Clock component**: live ticking in Europe/London timezone
- **All admin portal pages**: Dashboard (live stats + revenue chart + clock), Orders, Customers, Products, Returns, Back-in-Stock, Pre-orders, Support, Notifications, Settings/History
- **Pre-orders module**: model + admin API (CRUD)
- **Support Tickets module**: model + admin API (CRUD)
- **Revenue currency**: all ZAR→GBP, date locale en-ZA→en-GB
- **Returns 401 fixed**: AUTHENTICATE=false restored, admin portal redeployed with ADMIN_API_SECRET
- **PostgreSQL migrated to EU West**: new EU PG at `reseau.proxy.rlwy.net:45985`; 2808 data rows copied, country-region assignments restored
- **Dual-domain architecture**: `api.mavirecodoir.com` (DNS-only, fast), `admin-backend.mavirecodoir.com` (proxied, behind Cloudflare Access)
- **Cloudflare Access**: path-based, protects only `/app*` + `/admin*`
- **TS build error FIXED**: `check-db-paypal.ts` — `pgConnection.execute` → `pgConnection.raw` (Knex API); committed `9c2fc5b`, pushed

## Deployment Status
- **Deploy `3571af71`**: **SUCCESS** — shipping profile fix + PayPal route override ARE live on Railway
- **Deploy `a459880f`**: **FAILED** (build-stage, no app logs) — likely auto-deploy of code WITH the TS error
- **Current**: Pushed `9c2fc5b` (TS fix), Railway auto-deploying

## Pending
- **Verify shipping options in admin UI** for Main Warehouse – London (should now show since deploy 3571af71 is live)
- **Test PayPal checkout** on live site — route override should show real error messages
- **Check fulfillment provider**: user reports "manual, not automatic" — may need config
- **Stripe webhook subscriber** (`payment-webhook`): resolves `pp_stripe` but registered provider is `pp_stripe_stripe` — verify if causing issues
- **Verify Brevo template IDs** match dashboard (1=Confirm, 2=Shipping, 3=Back-in-stock, 5=Cancel/Refund)
- **Deploy Sanity Studio**: `npx sanity deploy` for managed CMS URL
- **Add images to blog posts** via Sanity asset upload
- **Set `www.mavirecodoir.com`** as Vercel custom domain
- **Admin API proxy routes** — monitor for any auth/permission issues
- **Rate limiting on track-order** — in-memory Map resets on restart; upgrade to Redis-based if needed

## Key Config
- `ADMIN_API_SECRET` = `RUfGs7cVMv4KwYkTq9rzF2lgXStN5y3e` (Railway + Vercel)
- PG (EU): `reseau.proxy.rlwy.net:45985` (illustrious-tenderness)
- PG (US fallback): `thomas.proxy.rlwy.net:13141`
- Cloudflare Zone: `ce5aa490eebac1515c6c90bcad200b4c`
- Brevo API key: `xkeysib-...` in backend `.env`
- Frontend Stripe key: `pk_live_51SyvoL...`
- Frontend URL: `https://www.mavirecodoir.com`
- Admin portal: `https://retail-admin.mavirecodoir.com`
- Medusa Admin (Cloudflare Access): `https://admin-backend.mavirecodoir.com/app`
- Backend API: `https://api.mavirecodoir.com`
- Stripe webhook: `https://api.mavirecodoir.com/hooks/payment/stripe`
- PayPal webhook: `https://api.mavirecodoir.com/store/paypal/webhook`
