// @ts-check
// Personal sign-in name for staff ("MM" for Max Mustermann). Plain JS next to the migrations,
// because setup.js runs migration 008 without the Nitro bundle.

export const SHORT_CODE_MAX_LENGTH = 8;

/** @type {Record<string, string>} */
const UMLAUTS = { Ä: "AE", Ö: "OE", Ü: "UE", ß: "SS" };

/**
 * Upper case letters and digits only, so "mm", " M-M " and "MM" are the same short code.
 * @param {unknown} value
 */
export function normalizeShortCode(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toUpperCase()
    .replace(/[ÄÖÜß]/g, (char) => UMLAUTS[char] ?? char)
    .normalize("NFD")
    .replace(/[^A-Z0-9]/g, "");
}

/** @param {string} value */
export function isValidShortCode(value) {
  return /^[A-Z0-9]{2,8}$/.test(value);
}

/**
 * A name that already is a short code ("AL", "KMS") stays as it is; otherwise the initials of first
 * and last name. A number is added when the short code is taken.
 * @param {string} name
 * @param {Set<string>} taken
 */
export function suggestShortCode(name, taken) {
  const whole = normalizeShortCode(name);
  if (!/\s/.test(String(name).trim()) && isValidShortCode(whole) && !taken.has(whole)) return whole;

  const words = String(name)
    .split(/\s+/)
    .map((word) => normalizeShortCode(word))
    .filter(Boolean);
  const first = words[0] ?? "";
  const last = words[words.length - 1] ?? "";
  let base = words.length >= 2 ? first.charAt(0) + last.charAt(0) : (words[0] ?? "MA").slice(0, 2);
  if (base.length < 2) base = (base + "X").slice(0, 2);

  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Gives every staff member without a short code one, e.g. people added by a seed after the migration.
 * @param {import("better-sqlite3").Database} database
 */
export function assignMissingShortCodes(database) {
  const missing = /** @type {{ staff_id: number; name: string }[]} */ (
    database.prepare("SELECT staff_id, name FROM staff WHERE short_code IS NULL ORDER BY staff_id").all()
  );
  if (missing.length === 0) return 0;
  const codes = /** @type {{ short_code: string }[]} */ (database.prepare("SELECT short_code FROM staff WHERE short_code IS NOT NULL").all());
  const taken = new Set(codes.map((row) => row.short_code));
  const update = database.prepare("UPDATE staff SET short_code = ? WHERE staff_id = ?");
  for (const row of missing) {
    const code = suggestShortCode(row.name, taken);
    taken.add(code);
    update.run(code, row.staff_id);
  }
  return missing.length;
}
