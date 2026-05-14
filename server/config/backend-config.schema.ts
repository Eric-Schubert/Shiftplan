import type { BackendConfig } from "./backend-config.types";

const HTTP_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"]);
const SAME_SITE_VALUES = new Set(["strict", "lax", "none"]);

type MutableErrorList = string[];

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

function validateDatabase(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "database", errors);
  stringAt(config.directory, "database.directory", errors);
  stringAt(config.mainFile, "database.mainFile", errors);
  stringAt(config.adminFile, "database.adminFile", errors);

  const pragmas = objectAt(config.pragmas, "database.pragmas", errors);
  booleanAt(pragmas.foreignKeys, "database.pragmas.foreignKeys", errors);
  stringAt(pragmas.journalMode, "database.pragmas.journalMode", errors);
}

function validateAuth(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "auth", errors);
  const policy = objectAt(config.passwordPolicy, "auth.passwordPolicy", errors);
  integerAt(policy.minLength, "auth.passwordPolicy.minLength", errors, { min: 1 });
  integerAt(policy.maxLength, "auth.passwordPolicy.maxLength", errors, { min: 1 });
  booleanAt(policy.requireUppercase, "auth.passwordPolicy.requireUppercase", errors);
  booleanAt(policy.requireLowercase, "auth.passwordPolicy.requireLowercase", errors);
  booleanAt(policy.requireNumber, "auth.passwordPolicy.requireNumber", errors);
  stringAt(policy.hint, "auth.passwordPolicy.hint", errors);
  rangeOrder(policy.minLength, policy.maxLength, "auth.passwordPolicy", errors);

  integerAt(config.passwordHashCost, "auth.passwordHashCost", errors, { min: 4, max: 15 });
  integerAt(config.bootstrapPasswordHashCost, "auth.bootstrapPasswordHashCost", errors, {
    min: 4,
    max: 15,
  });
  booleanAt(config.trustProxyHeaders, "auth.trustProxyHeaders", errors);

  const users = objectAt(config.users, "auth.users", errors);
  integerAt(users.usernameMinLength, "auth.users.usernameMinLength", errors, { min: 1 });
  integerAt(users.usernameMaxLength, "auth.users.usernameMaxLength", errors, { min: 1 });
  rangeOrder(users.usernameMinLength, users.usernameMaxLength, "auth.users", errors);

  const session = objectAt(config.session, "auth.session", errors);
  integerAt(session.durationMinutes, "auth.session.durationMinutes", errors, { min: 1 });
  booleanAt(session.extendOnActivity, "auth.session.extendOnActivity", errors);
  integerAt(session.tokenBytes, "auth.session.tokenBytes", errors, { min: 16 });
  integerAt(session.csrfTokenBytes, "auth.session.csrfTokenBytes", errors, { min: 16 });

  const cookies = objectAt(session.cookies, "auth.session.cookies", errors);
  stringAt(cookies.sessionName, "auth.session.cookies.sessionName", errors);
  stringAt(cookies.csrfName, "auth.session.cookies.csrfName", errors);
  oneOf(cookies.sameSite, "auth.session.cookies.sameSite", SAME_SITE_VALUES, errors);
  stringAt(cookies.path, "auth.session.cookies.path", errors);
  booleanAt(cookies.secureInProduction, "auth.session.cookies.secureInProduction", errors);

  const limit = objectAt(config.loginRateLimit, "auth.loginRateLimit", errors);
  integerAt(limit.maxAttempts, "auth.loginRateLimit.maxAttempts", errors, { min: 1 });
  integerAt(limit.windowMinutes, "auth.loginRateLimit.windowMinutes", errors, { min: 1 });
  integerAt(limit.blockMinutes, "auth.loginRateLimit.blockMinutes", errors, { min: 1 });

  const routes = objectAt(config.routes, "auth.routes", errors);
  stringArrayAt(routes.public, "auth.routes.public", errors);
  stringArrayAt(routes.publicGetPrefixes, "auth.routes.publicGetPrefixes", errors);
  const methods = stringArrayAt(routes.csrfMethods, "auth.routes.csrfMethods", errors);
  for (const method of methods) {
    if (!HTTP_METHODS.has(method.toUpperCase())) {
      errors.push(`auth.routes.csrfMethods enthaelt eine unbekannte HTTP-Methode: ${method}`);
    }
  }
}

function validateValidation(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "validation", errors);
  const strings = objectAt(config.string, "validation.string", errors);
  integerAt(strings.defaultMinLength, "validation.string.defaultMinLength", errors, { min: 0 });
  integerAt(strings.defaultMaxLength, "validation.string.defaultMaxLength", errors, { min: 1 });
  rangeOrder(strings.defaultMinLength, strings.defaultMaxLength, "validation.string", errors);

  const name = objectAt(config.name, "validation.name", errors);
  integerAt(name.defaultMaxLength, "validation.name.defaultMaxLength", errors, { min: 1 });
  validateRange(config.year, "validation.year", errors);
  validateRange(config.week, "validation.week", errors);
  validateRange(config.id, "validation.id", errors);

  const shift = objectAt(config.shift, "validation.shift", errors);
  stringAt(shift.defaultColor, "validation.shift.defaultColor", errors);
  if (typeof shift.defaultColor === "string" && !/^#[0-9a-fA-F]{6}$/.test(shift.defaultColor)) {
    errors.push("validation.shift.defaultColor muss ein Hex-Farbwert sein");
  }
  validateDefaultRange(shift.minStaff, "validation.shift.minStaff", errors);
  validateDefaultRange(shift.sortOrder, "validation.shift.sortOrder", errors);
}

function validateRotation(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "rotation", errors);
  integerAt(config.defaultCycleLength, "rotation.defaultCycleLength", errors, { min: 1 });
  integerAt(config.defaultStartWeek, "rotation.defaultStartWeek", errors, { min: 1, max: 53 });
  integerAt(config.cycleLengthMin, "rotation.cycleLengthMin", errors, { min: 1 });
  integerAt(config.cycleLengthMax, "rotation.cycleLengthMax", errors, { min: 1 });
  integerAt(config.excelImportMaxBytes, "rotation.excelImportMaxBytes", errors, { min: 1 });
  rangeOrder(config.cycleLengthMin, config.cycleLengthMax, "rotation.cycleLength", errors);
}

function validateShiftplan(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "shiftplan", errors);
  integerAt(config.generateWeeksMin, "shiftplan.generateWeeksMin", errors, { min: 1 });
  integerAt(config.generateWeeksMax, "shiftplan.generateWeeksMax", errors, { min: 1 });
  rangeOrder(config.generateWeeksMin, config.generateWeeksMax, "shiftplan.generateWeeks", errors);
}

function validateXlsx(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "xlsx", errors);
  for (const key of [
    "maxZipEntryCount",
    "maxZipEntryUncompressedBytes",
    "maxZipTotalUncompressedBytes",
    "maxZipExpansionRatio",
    "maxWorksheetCount",
    "maxWorksheetRows",
    "maxWorksheetColumns",
  ]) {
    integerAt(config[key], `xlsx.${key}`, errors, { min: 1 });
  }
}

function validateHolidays(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "holidays", errors);
  stringAt(config.timezone, "holidays.timezone", errors);
  validateTimeZone(config.timezone, "holidays.timezone", errors);
  oneOf(config.provider, "holidays.provider", new Set(["openHolidays"]), errors);
  stringAt(config.apiBaseUrl, "holidays.apiBaseUrl", errors);
  stringAt(config.countryIsoCode, "holidays.countryIsoCode", errors);
  stringAt(config.languageIsoCode, "holidays.languageIsoCode", errors);
  integerAt(config.cacheHours, "holidays.cacheHours", errors, { min: 1 });

  const publicConfig = objectAt(config.public, "holidays.public", errors);
  booleanAt(publicConfig.includeNationwide, "holidays.public.includeNationwide", errors);
  const publicStates = stringArrayAt(
    publicConfig.subdivisionCodes,
    "holidays.public.subdivisionCodes",
    errors
  );
  oneOf(publicConfig.regionalType, "holidays.public.regionalType", new Set(["regional"]), errors);

  const school = objectAt(config.school, "holidays.school", errors);
  const schoolStates = stringArrayAt(
    school.defaultSubdivisionCodes,
    "holidays.school.defaultSubdivisionCodes",
    errors,
    { minLength: 1 }
  );
  const window = objectAt(school.lookupWindow, "holidays.school.lookupWindow", errors);
  integerAt(window.startYearOffset, "holidays.school.lookupWindow.startYearOffset", errors);
  integerAt(window.startMonth, "holidays.school.lookupWindow.startMonth", errors, { min: 1, max: 12 });
  integerAt(window.startDay, "holidays.school.lookupWindow.startDay", errors, { min: 1, max: 31 });
  integerAt(window.endYearOffset, "holidays.school.lookupWindow.endYearOffset", errors);
  integerAt(window.endMonth, "holidays.school.lookupWindow.endMonth", errors, { min: 1, max: 12 });
  integerAt(window.endDay, "holidays.school.lookupWindow.endDay", errors, { min: 1, max: 31 });

  const names = objectAt(config.subdivisionNames, "holidays.subdivisionNames", errors);
  for (const code of [...publicStates, ...schoolStates]) {
    if (!names[normalizeSubdivisionCode(code)]) {
      errors.push(`holidays.subdivisionNames fehlt fuer Bundesland ${code}`);
    }
  }
}

function validateContact(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "contact", errors);
  const rateLimit = objectAt(config.rateLimit, "contact.rateLimit", errors);
  integerAt(rateLimit.windowMinutes, "contact.rateLimit.windowMinutes", errors, { min: 1 });
  integerAt(rateLimit.maxMessages, "contact.rateLimit.maxMessages", errors, { min: 1 });

  const list = objectAt(config.list, "contact.list", errors);
  integerAt(list.defaultLimit, "contact.list.defaultLimit", errors, { min: 1 });
  integerAt(list.maxLimit, "contact.list.maxLimit", errors, { min: 1 });
  rangeOrder(list.defaultLimit, list.maxLimit, "contact.list", errors);

  const storage = objectAt(config.storage, "contact.storage", errors);
  integerAt(storage.subjectMaxLength, "contact.storage.subjectMaxLength", errors, { min: 1 });
  integerAt(storage.userAgentMaxLength, "contact.storage.userAgentMaxLength", errors, { min: 1 });

  const form = objectAt(config.form, "contact.form", errors);
  validateLength(form.name, "contact.form.name", errors);
  validateLength(form.replyTo, "contact.form.replyTo", errors);
  validateLength(form.subject, "contact.form.subject", errors);
  validateLength(form.message, "contact.form.message", errors);
}

function validateAnalytics(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "analytics", errors);
  stringAt(config.timezone, "analytics.timezone", errors);
  validateTimeZone(config.timezone, "analytics.timezone", errors);
  integerAt(config.retentionDays, "analytics.retentionDays", errors, { min: 1 });
  const summary = objectAt(config.summary, "analytics.summary", errors);
  integerAt(summary.defaultDays, "analytics.summary.defaultDays", errors, { min: 1 });
  integerAt(summary.maxDays, "analytics.summary.maxDays", errors, { min: 1 });
  rangeOrder(summary.defaultDays, summary.maxDays, "analytics.summary", errors);
  integerAt(config.topPagesLimit, "analytics.topPagesLimit", errors, { min: 1 });
  integerAt(config.locationsLimit, "analytics.locationsLimit", errors, { min: 1 });

  const text = objectAt(config.text, "analytics.text", errors);
  for (const key of [
    "pathMaxLength",
    "userAgentMaxLength",
    "referrerMaxLength",
    "referrerHostMaxLength",
    "countryCodeMaxLength",
    "regionMaxLength",
    "cityMaxLength",
  ]) {
    integerAt(text[key], `analytics.text.${key}`, errors, { min: 1 });
  }
}

function validateAudit(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "audit", errors);
  integerAt(config.defaultLimit, "audit.defaultLimit", errors, { min: 1 });
  integerAt(config.maxLimit, "audit.maxLimit", errors, { min: 1 });
  rangeOrder(config.defaultLimit, config.maxLimit, "audit", errors);
}

function validateContactMail(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "contactMail", errors);
  oneOf(config.provider, "contactMail.provider", new Set(["graph"]), errors);
  stringAt(config.subjectPrefix, "contactMail.subjectPrefix", errors);
  booleanAt(config.saveToSentItemsDefault, "contactMail.saveToSentItemsDefault", errors);
  integerAt(config.tokenSkewSeconds, "contactMail.tokenSkewSeconds", errors, { min: 0 });
  stringAt(config.graphScope, "contactMail.graphScope", errors);
  stringAt(config.dateLocale, "contactMail.dateLocale", errors);
  stringAt(config.timezone, "contactMail.timezone", errors);
  validateTimeZone(config.timezone, "contactMail.timezone", errors);
  integerAt(config.subjectMaxLength, "contactMail.subjectMaxLength", errors, { min: 1 });
  integerAt(config.errorBodyMaxLength, "contactMail.errorBodyMaxLength", errors, { min: 1 });
}

function validateRange(value: unknown, path: string, errors: MutableErrorList): void {
  const range = objectAt(value, path, errors);
  integerAt(range.min, `${path}.min`, errors);
  integerAt(range.max, `${path}.max`, errors);
  rangeOrder(range.min, range.max, path, errors);
}

function validateDefaultRange(value: unknown, path: string, errors: MutableErrorList): void {
  const range = objectAt(value, path, errors);
  validateRange(range, path, errors);
  integerAt(range.default, `${path}.default`, errors);
  if (
    typeof range.default === "number" &&
    typeof range.min === "number" &&
    typeof range.max === "number" &&
    (range.default < range.min || range.default > range.max)
  ) {
    errors.push(`${path}.default muss zwischen min und max liegen`);
  }
}

function validateLength(value: unknown, path: string, errors: MutableErrorList): void {
  const range = objectAt(value, path, errors);
  integerAt(range.minLength, `${path}.minLength`, errors, { min: 0 });
  integerAt(range.maxLength, `${path}.maxLength`, errors, { min: 1 });
  rangeOrder(range.minLength, range.maxLength, path, errors);
}

function objectAt(value: unknown, path: string, errors: MutableErrorList): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} muss ein Objekt sein`);
    return {};
  }
  return value as Record<string, any>;
}

function stringAt(value: unknown, path: string, errors: MutableErrorList): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} muss ein nicht-leerer String sein`);
    return "";
  }
  return value;
}

function stringArrayAt(
  value: unknown,
  path: string,
  errors: MutableErrorList,
  options: { minLength?: number } = {}
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${path} muss eine String-Liste sein`);
    return [];
  }
  if (options.minLength && value.length < options.minLength) {
    errors.push(`${path} muss mindestens ${options.minLength} Eintrag enthalten`);
  }
  return value;
}

function booleanAt(value: unknown, path: string, errors: MutableErrorList): boolean {
  if (typeof value !== "boolean") {
    errors.push(`${path} muss true oder false sein`);
    return false;
  }
  return value;
}

function integerAt(
  value: unknown,
  path: string,
  errors: MutableErrorList,
  options: { min?: number; max?: number } = {}
): number {
  if (!Number.isInteger(value)) {
    errors.push(`${path} muss eine ganze Zahl sein`);
    return 0;
  }
  const numberValue = value as number;
  if (options.min !== undefined && numberValue < options.min) {
    errors.push(`${path} darf nicht kleiner als ${options.min} sein`);
  }
  if (options.max !== undefined && numberValue > options.max) {
    errors.push(`${path} darf nicht groesser als ${options.max} sein`);
  }
  return numberValue;
}

function oneOf(
  value: unknown,
  path: string,
  allowed: Set<string>,
  errors: MutableErrorList
): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    errors.push(`${path} muss einer dieser Werte sein: ${Array.from(allowed).join(", ")}`);
  }
}

function rangeOrder(min: unknown, max: unknown, path: string, errors: MutableErrorList): void {
  if (typeof min === "number" && typeof max === "number" && min > max) {
    errors.push(`${path}.min darf nicht groesser als ${path}.max sein`);
  }
}

function validateTimeZone(value: unknown, path: string, errors: MutableErrorList): void {
  if (typeof value !== "string") return;
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: value }).format(new Date());
  } catch {
    errors.push(`${path} ist keine gueltige IANA-Zeitzone`);
  }
}

function normalizeSubdivisionCode(value: string): string {
  return value.replace(/^DE-/i, "").trim().toUpperCase();
}
