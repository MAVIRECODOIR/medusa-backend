import { Resend } from "resend";
import {
  AbstractNotificationProviderService,
} from "@medusajs/framework/utils";
import {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";

type Options = {
  apiKey: string;
  from: string;
};

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend-notification";
  protected resendClient: Resend;
  protected options: Options;
  protected logger: any;

  constructor(options: Options, logger?: any) {
    super();
    this.options = options;
    this.resendClient = new Resend(options.apiKey);
    this.logger = logger || console;
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const htmlContent = (notification.data?.html as string) || (notification.data?.content as string) || "";
    const subject = (notification.data?.subject as string) || "Medusa Notification";

    const { data, error } = await this.resendClient.emails.send({
      from: this.options.from,
      to: [notification.to as string],
      subject: subject,
      html: htmlContent,
    });

    if (error || !data) {
      if (error) {
        this.logger.error("Failed to send email", error);
      } else {
        this.logger.error("Failed to send email: unknown error");
      }
      return {};
    }

    return { id: data.id };
  }
}

export default ResendNotificationProviderService;
