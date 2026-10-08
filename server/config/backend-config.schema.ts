import type { BackendConfig } from "./backend-config.types";
import { validateAnalytics } from "./schema/analytics";
import { validateContact, validateContactMail } from "./schema/contact";
import {
  validateAudit,
  validateRotation,
  validateShiftplan,
  validateValidation,
  validateXlsx,
} from "./schema/domain";
import { objectAt, type MutableErrorList } from "./schema/fields";
import { validateHolidays } from "./schema/holidays";
import { validateAuth, validateDatabase } from "./schema/system";

export function validateBackendConfig(config: unknown): BackendConfig {
  const errors: MutableErrorList = [];
  const root = objectAt(config, "backend", errors);

  validateDatabase(root.database, errors);
  validateAuth(root.auth, errors);
  validateValidation(root.validation, errors);
  validateRotation(root.rotation, errors);
  validateShiftplan(root.shiftplan, errors);
  validateXlsx(root.xlsx, errors);
  validateHolidays(root.holidays, errors);
  validateContact(root.contact, errors);
  validateAnalytics(root.analytics, errors);
  validateAudit(root.audit, errors);
  validateContactMail(root.contactMail, errors);

  if (errors.length > 0) {
    throw new Error(`Ungueltige Backend-Konfiguration:\n- ${errors.join("\n- ")}`);
  }

  return config as BackendConfig;
}
