type ImprintAddress = {
  providerName?: string;
  streetAddress?: string;
  postalCode?: string;
  city?: string;
  country?: string;
};

/** Postal address of the provider, one line per entry, empty parts left out. */
export function imprintAddressLines(imprint: ImprintAddress): string[] {
  const postalCity = [imprint.postalCode, imprint.city].filter(Boolean).join(" ");
  return [imprint.providerName, imprint.streetAddress, postalCity, imprint.country].filter(
    (line): line is string => Boolean(line)
  );
}
