import {
  booleanAt,
  integerAt,
  objectAt,
  oneOf,
  stringArrayAt,
  stringAt,
  validateTimeZone,
  type MutableErrorList,
} from "./fields";

export function validateHolidays(value: unknown, errors: MutableErrorList): void {
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

function normalizeSubdivisionCode(value: string): string {
  return value.replace(/^DE-/i, "").trim().toUpperCase();
}
