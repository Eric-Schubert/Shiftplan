import type { ContactMessage } from "~/types/contact";
import { getContactMailDefaults } from "~/server/config/contact-mail-config";
import { GRAPH_REQUEST_TIMEOUT_MS, type ContactMailConfig } from "~/server/services/contact-mail/config";
import { getGraphAccessToken } from "~/server/services/contact-mail/graph-token";
import { buildMailText, buildSubject, getReplyAddress } from "~/server/services/contact-mail/message";

async function readResponseText(response: Response): Promise<string> {
  return (await response.text().catch(() => "")).slice(0, getContactMailDefaults().errorBodyMaxLength);
}

export async function sendGraphMail(config: ContactMailConfig, message: ContactMessage): Promise<void> {
  const accessToken = await getGraphAccessToken(config);
  const replyAddress = getReplyAddress(message.reply_to);
  const payload = {
    message: {
      subject: buildSubject(message, config.subjectPrefix),
      body: {
        contentType: "Text",
        content: buildMailText(message),
      },
      toRecipients: config.to.map((address) => ({
        emailAddress: { address },
      })),
      ...(replyAddress
        ? {
            replyTo: [
              {
                emailAddress: {
                  address: replyAddress,
                  name: message.name,
                },
              },
            ],
          }
        : {}),
    },
    saveToSentItems: config.saveToSentItems,
  };

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.from)}/sendMail`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(GRAPH_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${await readResponseText(response)}`);
  }
}
