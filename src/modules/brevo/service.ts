import { AbstractNotificationProviderService } from "@medusajs/framework/utils";
import { ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types";
import { BrevoClient } from "@getbrevo/brevo";
import { Resend } from "resend";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

const INTERNAL_TEMPLATES = ["password-reset", "admin-invite", "user-invite", "verification-code"];

const TEMPLATE_PATTERNS: [RegExp, number][] = [
  [/order.*(placed|confirm)|order\.placed/i, 1],
  [/ship|fulfillment.*created|order.*shipped/i, 2],
  [/order.*cancel|order.*refund/i, 5],
];

const LEGACY_CDN = "pub-cb269c46bd284333bcafb48988f70133.r2.dev";
const CDN_DOMAIN = "cdn.mavirecodoir.com";

function rewriteImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace(LEGACY_CDN, CDN_DOMAIN);
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2,
  }).format(cents / 100);
}

function buildItemsHtml(items: any[], currency: string): string {
  if (!items?.length) return "";
  return items.map((item: any) => {
    const imgUrl = rewriteImageUrl(item.thumbnail);
    const name = item.variant?.title ? `${item.title} — ${item.variant.title}` : item.title;
    const lineTotal = (item.unit_price || 0) * (item.quantity || 1);
    const imgTag = imgUrl
      ? `<img src="${imgUrl}" width="48" height="64" alt="" style="display:inline-block;vertical-align:middle;margin-right:12px;object-fit:cover;border-radius:2px;">`
      : "";
    return `<tr>
<td style="padding:8px 0;font-size:13px;color:#1A1A1A;vertical-align:middle;">${imgTag}<span style="vertical-align:middle;">${name}</span></td>
<td style="padding:8px 0;font-size:13px;color:#666;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">${item.quantity}</td>
<td style="padding:8px 0;font-size:13px;color:#1A1A1A;text-align:right;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">${formatPrice(lineTotal, currency)}</td>
</tr>`;
  }).join("\n");
}

type Options = {
  brevoApiKey: string;
  resendApiKey: string;
  from: string;
  senderName?: string;
  store_url?: string;
  backend_url?: string;
};

class BrevoNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "brevo-notification";
  protected brevoClient: BrevoClient;
  protected resendClient: Resend;
  protected options: Options;
  protected logger: any;
  protected templateIdMap: Record<string, number>;

  constructor({ logger }: { logger: any }, options: Options) {
    super();
    this.options = options;
    this.brevoClient = new BrevoClient({ apiKey: options.brevoApiKey });
    this.resendClient = new Resend(options.resendApiKey);
    this.logger = logger;
    this.templateIdMap = {};
    this.loadTemplateIds();
  }

  private loadTemplateIds() {
    try {
      const jsonPath = path.resolve(__dirname, "./template-ids.json");
      if (fs.existsSync(jsonPath)) {
        const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        for (const val of Object.values(raw) as any[]) {
          this.templateIdMap[val.name] = val.id;
        }
        this.logger.info(`Loaded ${Object.keys(this.templateIdMap).length} Brevo template IDs`);
      }
    } catch (err) {
      this.logger.warn("Could not load template-ids.json, will send raw HTML");
    }
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const template = (notification.template || "") as string;
    const isInternal = INTERNAL_TEMPLATES.some((t) => template.toLowerCase().includes(t));

    if (isInternal) {
      return this.sendViaResend(notification);
    }
    return this.sendViaBrevo(notification);
  }

  private async sendViaResend(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const html = (notification.data?.html as string) || notification.content?.html || "";
    const subject = (notification.data?.subject as string) || notification.content?.subject || "Medusa Notification";

    try {
      const { data, error } = await this.resendClient.emails.send({
        from: this.options.from,
        to: [notification.to as string],
        subject,
        html,
      });

      if (error || !data) {
        if (error) this.logger.error("Resend failed", error);
        return {};
      }
      return { id: data.id };
    } catch (error) {
      this.logger.error("Resend error", error);
      return {};
    }
  }

  private async sendViaBrevo(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const template = (notification.template || "") as string;
    const toName = (notification.data?.customer_name as string) || "";
    const toEmail = notification.to as string;

    const templateId = this.resolveTemplateId(template);
    const params: Record<string, any> = { ...notification.data };

    // Common defaults for all transactional emails
    const storeUrl = this.options.store_url || "https://mavirecodoir.com";
    const now = new Date();
    params.storeUrl = storeUrl;
    params.year = now.getFullYear().toString();
    if (!params.instagramUrl) params.instagramUrl = "https://instagram.com/mavirecodoir";
    if (!params.supportEmail) params.supportEmail = "hello@mavirecodoir.com";
    if (!params.unsubscribeUrl) params.unsubscribeUrl = `${storeUrl}/unsubscribe`;

    // Build order-specific params (items HTML, order URLs)
    const order = params as Record<string, any>;
    const orderId = order.id as string | undefined;
    if (orderId && templateId) {
      if (order.created_at) {
        params.orderDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(order.created_at));
      }
      const metadata = (order.metadata || {}) as Record<string, any>;
      const token = metadata.access_token || "";
      const currency = (order.currency_code as string) || "GBP";

      if (/order.*(placed|confirm)/i.test(template)) {
        params.orderUrl = token
          ? `${storeUrl}/order/${orderId}?token=${encodeURIComponent(token)}`
          : `${storeUrl}/track-order`;
        params.itemsHtml = buildItemsHtml(order.items as any[], currency);
      }
      if (/order.*cancel|order.*refund/i.test(template)) {
        params.itemsHtml = buildItemsHtml(order.items as any[], currency);
      }
    }

    try {
      let payload: any;

      if (templateId) {
        payload = {
          templateId,
          params,
          to: [{ email: toEmail, name: toName }],
        };
      } else {
        const html = (notification.data?.html as string) || notification.content?.html || "";
        const subject = (notification.data?.subject as string) || notification.content?.subject || "Medusa Notification";
        payload = {
          htmlContent: html,
          subject,
          sender: { email: this.options.from, name: this.options.senderName || "" },
          to: [{ email: toEmail, name: toName }],
        };
      }

      const response = (await this.brevoClient.transactionalEmails.sendTransacEmail(payload)) as any;
      const messageId = response.messageId;
      return messageId ? { id: messageId } : {};
    } catch (error) {
      this.logger.error("Brevo failed", error);
      return {};
    }
  }

  private resolveTemplateId(template: string): number | null {
    for (const [pattern, tmplId] of TEMPLATE_PATTERNS) {
      if (pattern.test(template)) {
        return tmplId;
      }
    }
    return null;
  }
}

export default BrevoNotificationProviderService;
