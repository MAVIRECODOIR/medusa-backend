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

    // Inject frontend URLs for order-related emails
    const storeUrl = this.options.store_url || "https://mavirecodoir.com";
    const orderId = (params as any).id as string | undefined;
    if (orderId && templateId && /order.*(placed|confirm)/i.test(template)) {
      const order = params as Record<string, any>;
      const metadata = (order.metadata || {}) as Record<string, any>;
      const token = metadata.access_token || "";
      params.orderUrl = token
        ? `${storeUrl}/order/${orderId}?token=${encodeURIComponent(token)}`
        : `${storeUrl}/track-order`;
      params.storeUrl = storeUrl;
      const now = new Date();
      params.year = now.getFullYear().toString();
      // Format order date for email display
      if (order.created_at) {
        params.orderDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(order.created_at));
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
