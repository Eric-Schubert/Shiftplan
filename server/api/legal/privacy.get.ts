import { getContactMailConfig } from "~/server/services/contact-mail/config";

/** Deployment facts the privacy policy depends on that only the server knows. */
export default defineEventHandler(() => {
  let microsoft = false;
  try {
    microsoft = getContactMailConfig() !== null;
  } catch {
    // Incomplete mail settings never send anything to Microsoft.
  }
  return { microsoft };
});
