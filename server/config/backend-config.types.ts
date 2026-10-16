import type { AnalyticsSettings } from "./types/analytics";
import type { ContactMailSettings, ContactSettings } from "./types/contact";
import type { AuditSettings, RotationSettings, ShiftplanSettings, ValidationSettings, XlsxSettings } from "./types/domain";
import type { HolidaySettings } from "./types/holidays";
import type { AuthSettings, DatabaseSettings } from "./types/system";

export type { DefaultRangeConfig, RangeConfig } from "./types/domain";
export type { LengthConfig } from "./types/contact";

export type BackendConfig = {
  database: DatabaseSettings;
  auth: AuthSettings;
  validation: ValidationSettings;
  rotation: RotationSettings;
  shiftplan: ShiftplanSettings;
  xlsx: XlsxSettings;
  holidays: HolidaySettings;
  contact: ContactSettings;
  analytics: AnalyticsSettings;
  audit: AuditSettings;
  contactMail: ContactMailSettings;
};

/**
 * What the built-in defaults (server/lib/config/defaults.js) and a complete config file hold: everything
 * except auth.routes, which route-config.ts resolves after validation.
 */
export type BackendConfigFile = Omit<BackendConfig, "auth"> & { auth: Omit<AuthSettings, "routes"> };
