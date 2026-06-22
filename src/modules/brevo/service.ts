import { AbstractNotificationProviderService } from "@medusajs/framework/utils";
import { ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types";
import { BrevoClient } from "@getbrevo/brevo";
import { Resend } from "resend";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

const INTERNAL_TEMPLATES = ["password-reset", "admin-invite", "user-invite", "verification-code"];

const TEMPLATES_DIR = path.resolve(__dirname, "./templates");

const TEMPLATE_PATTERNS: [RegExp, number, string?, string?][] = [
  [/order.*(placed|confirm)|order\.placed/i, 1, "order-confirmation.html", "Your Order Has Been Confirmed — MAVIRE CODOIR"],
  [/ship|fulfillment.*created|order.*shipped/i, 2, "shipping-confirmation.html", "Your Order Has Been Shipped — MAVIRE CODOIR"],
  [/order.*cancel|order.*refund/i, 5, "cancellation-refund.html", "Your Order Has Been Cancelled — MAVIRE CODOIR"],
];

const RAW_HTML_PARAMS = new Set(["itemsHtml", "shippingAddress"]);

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
    const name = item.variant?.title ? `${item.title} — ${item.variant.title}` : (item.title || "Item");
    const qty = item.quantity ?? 0;
    const unitPrice = item.unit_price ?? 0;
    const lineTotal = unitPrice * qty;
    const imgTag = imgUrl
      ? `<img src="${imgUrl}" width="48" height="64" alt="" style="display:inline-block;vertical-align:middle;margin-right:12px;object-fit:cover;border-radius:2px;">`
      : "";
    return `<tr>
<td style="padding:8px 0;font-size:13px;color:#1A1A1A;vertical-align:middle;">${imgTag}<span style="vertical-align:middle;">${name}</span></td>
<td style="padding:8px 0;font-size:13px;color:#666;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">${qty}</td>
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
    const storeUrl = "https://www.mavirecodoir.com";
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
        params.orderUrl = `${storeUrl}/client/my-account`;
        params.itemsHtml = buildItemsHtml(order.items as any[], currency);
      }
      if (/order.*cancel|order.*refund/i.test(template)) {
        params.itemsHtml = buildItemsHtml(order.items as any[], currency);
      }
    }

    try {
      let payload: any;
      const rendered = this.tryRenderTemplate(template, params);

      if (rendered) {
        payload = {
          htmlContent: rendered.html,
          subject: rendered.subject,
          sender: { email: this.options.from, name: this.options.senderName || "" },
          to: [{ email: toEmail, name: toName }],
        };
      } else if (templateId) {
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

  private tryRenderTemplate(template: string, params: Record<string, any>): { html: string; subject: string } | null {
    for (const [pattern, _id, filename, subject] of TEMPLATE_PATTERNS) {
      if (filename && pattern.test(template)) {
        try {
          const filePath = path.join(TEMPLATES_DIR, filename);
          if (!fs.existsSync(filePath)) return null;
          let html = fs.readFileSync(filePath, "utf-8");
          html = html.replace(/\{\{params\.(\w+)\}\}/g, (_m, key: string) => {
            const value = params[key];
            if (value === undefined || value === null) return "";
            if (RAW_HTML_PARAMS.has(key)) return String(value);
            return String(value)
              .replace(/&/g, "&amp;").replace(/</g, "&lt;")
              .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          });
          return { html, subject: subject || "MAVIRE CODOIR" };
        } catch (err) {
          this.logger.warn(`Failed to render template ${filename}: ${err}`);
          return null;
        }
      }
    }
    return null;
  }
}

export default BrevoNotificationProviderService;
