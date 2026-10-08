import { integerAt, objectAt, stringAt, validateTimeZone, type MutableErrorList } from "./fields";
import { rangeOrder } from "./ranges";

export function validateAnalytics(value: unknown, errors: MutableErrorList): void {
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
