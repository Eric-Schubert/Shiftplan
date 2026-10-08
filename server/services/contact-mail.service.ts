import type { ContactMessage } from "~/types/contact";
import { getContactMailConfig } from "~/server/services/contact-mail/config";
import { sendGraphMail } from "~/server/services/contact-mail/graph-mail";

export { resetContactMailTokenCacheForTests } from "~/server/services/contact-mail/graph-token";

export class ContactMailService {
  static async sendMessageNotification(message: ContactMessage): Promise<void> {
    const config = getContactMailConfig();
    if (!config) return;

    await sendGraphMail(config, message);
  }
}
